import { Router } from "express";
import redisClient, { flushDb } from "../config/redis.js";
import * as metrics from "../utils/metrics.js";
import { getCached, setCached, clearCache, getOrCreatePendingRequest } from "../utils/cache-manager.js";

const router = Router();
const TTL = Number(process.env.CACHE_TTL_SEC) || 60;
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 5000;
const MAX_RETRIES = Number(process.env.MAX_RETRIES) || 2;

// Helper: retry logic with exponential backoff
async function fetchWithRetry(url, retries = MAX_RETRIES) {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status >= 500 && i < retries) {
          // Retry on server errors
          const backoff = Math.pow(2, i) * 1000;
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      return { success: true, data, status: response.status };
    } catch (err) {
      if (i === retries) {
        return { success: false, error: err.message };
      }
      const backoff = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, backoff));
    }
  }
}

router.get("/proxy", async (req, res) => {
  const startTime = Date.now();
  let targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  const cacheKey = targetUrl;

  try {
    /* ---------- 1️⃣ REDIS CACHE ---------- */
    const cached = await getCached(cacheKey);
    if (cached) {
      metrics.hit('redis');
      metrics.recordLatency(Date.now() - startTime);
      return res.json(cached);
    }

    /* ---------- 2️⃣ LRU CACHE ---------- */
    if (req.lruCache && req.lruCache.has(cacheKey)) {
      const lruData = req.lruCache.get(cacheKey);
      metrics.hit('lru');
      metrics.recordLatency(Date.now() - startTime);
      return res.json(lruData);
    }

    /* ---------- 3️⃣ CACHE MISS - REQUEST DEDUPLICATION ---------- */
    metrics.miss();

    const result = await getOrCreatePendingRequest(cacheKey, () => fetchWithRetry(targetUrl));

    if (!result.success) {
      metrics.recordError();
      if (result.error.includes("timed out")) {
        return res.status(504).json({ error: "Upstream request timed out" });
      }
      return res.status(502).json({ error: `Failed to fetch: ${result.error}` });
    }

    const { data } = result;

    /* ---------- STORE IN CACHE ---------- */
    await setCached(cacheKey, data, TTL);

    if (req.lruCache) {
      req.lruCache.set(cacheKey, data);
    }

    metrics.recordLatency(Date.now() - startTime);
    res.json(data);
  } catch (err) {
    metrics.recordError();
    console.error("Proxy request failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------- METRICS ENDPOINT ---------- */
router.get("/metrics", (req, res) => {
  res.json(metrics.stats());
});

/* ---------- HEALTH CHECK ENDPOINT ---------- */
router.get("/health", async (req, res) => {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    redis: redisClient.isOpen ? "connected" : "disconnected",
  };

  if (!redisClient.isOpen) {
    health.status = "degraded";
  }

  res.status(health.status === "ok" ? 200 : 503).json(health);
});

/* ---------- CACHE MANAGEMENT ---------- */
router.post("/cache/clear", async (req, res) => {
  const { url } = req.query;

  try {
    if (url) {
      // Clear specific URL
      const result = await clearCache(url);
      if (req.lruCache) {
        req.lruCache.delete(url);
      }
      return res.json(result);
    } else {
      // Clear all cache
      await flushDb();
      if (req.lruCache) {
        req.lruCache.clear();
      }
      return res.json({ success: true, message: "All cache cleared" });
    }
  } catch (err) {
    console.error("Cache clear error:", err);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

/* ---------- METRICS RESET ---------- */
router.post("/metrics/reset", (req, res) => {
  metrics.reset();
  res.json({ success: true, message: "Metrics reset" });
});

export default router;
