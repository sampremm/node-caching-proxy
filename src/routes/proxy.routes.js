import { Router } from "express";
import redisClient, { setEx, get } from "../config/redis.js";
import * as metrics from "../utils/metrics.js";


const router = Router();
const TTL = Number(process.env.CACHE_TTL_SEC) || 60;
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 5000;

router.get("/proxy", async (req, res) => {
  let targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "URL is required" });
  }

  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = `https://${targetUrl}`;
  }

  /* ---------- 1️⃣ REDIS CACHE ---------- */
  try {
    const cached = await get(targetUrl);
if (cached) {
  metrics.hit();
  return res.json(JSON.parse(cached));
}

  } catch (err) {
    console.warn("Redis get failed", err);
  }

  /* ---------- 2️⃣ LRU CACHE ---------- */
  if (req.lruCache) {
    const lruData = req.lruCache.get(targetUrl);
    if (lruData) {
      metrics.hit();
      return res.json(lruData);
    }
  }

  /* ---------- 3️⃣ CACHE MISS ---------- */
  metrics.miss();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Upstream API error: ${response.status}` });
    }

    const contentType = response.headers.get("content-type") || "";
    const data = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    /* ---------- STORE IN CACHE ---------- */
    try {
      await setEx(targetUrl, TTL, JSON.stringify(data));
    } catch (err) {
      console.warn("Redis setEx failed", err);
    }

    if (req.lruCache) {
      req.lruCache.set(targetUrl, data);
    }

    res.json(data);
  } catch (err) {
    if (err.name === "AbortError") {
      return res.status(504).json({ error: "Upstream request timed out" });
    }

    console.error("Fetch failed:", err);
    res.status(500).json({ error: "Failed to fetch API" });
  }
});

router.get("/metrics", (req, res) => {
  res.json(metrics.stats());
});

export default router;
