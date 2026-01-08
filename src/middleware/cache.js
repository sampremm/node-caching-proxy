import { LRUCache } from "lru-cache";
import redisClient from "../config/redis.js";


const lruCache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});


export default async function (req, res, next) {
  const key = req.query.url;

  // Redis first (safe guard)
  try {
    if (redisClient && redisClient.isOpen) {
      const redisData = await redisClient.get(key);
      if (redisData) {
        req.cacheHit = "REDIS";
        return res.json(JSON.parse(redisData));
      }
    }
  } catch (err) {
    console.warn("Redis unavailable, continuing with LRU", err);
  }

  // LRU fallback
  if (lruCache.has(key)) {
    req.cacheHit = "LRU";
    return res.json(lruCache.get(key));
  }

  req.lruCache = lruCache;
  next();
};
