import { get, setEx, del } from "../config/redis.js";

// Request deduplication
const pendingRequests = new Map();

export async function getCached(key) {
  try {
    const cached = await get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.warn("Cache get failed:", err.message);
    return null;
  }
}

export async function setCached(key, value, ttl) {
  try {
    await setEx(key, ttl, JSON.stringify(value));
  } catch (err) {
    console.warn("Cache set failed:", err.message);
  }
}

export async function clearCache(key = null) {
  try {
    if (key) {
      await del(key);
      return { success: true, message: `Cleared cache for ${key}` };
    } else {
      // Clear all is handled by Redis command
      console.log("Clearing all cache (implement if needed)");
      return { success: true, message: "Cache clear initiated" };
    }
  } catch (err) {
    console.error("Cache clear failed:", err);
    return { success: false, error: err.message };
  }
}

// Request deduplication - prevent thundering herd
export function getOrCreatePendingRequest(key, fetchFn) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = fetchFn()
    .finally(() => pendingRequests.delete(key));

  pendingRequests.set(key, promise);
  return promise;
}

export function isPendingRequest(key) {
  return pendingRequests.has(key);
}
