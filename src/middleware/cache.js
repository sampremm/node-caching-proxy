import { LRUCache } from "lru-cache";

// Initialize LRU cache with reasonable defaults
const lruCache = new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
});

export default function (req, res, next) {
  // Attach LRU cache to request for use in routes
  req.lruCache = lruCache;
  next();
}

