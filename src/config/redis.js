import { createClient } from "redis";

const rawUrl = process.env.REDIS_URL;
const useRedis = process.env.USE_REDIS !== "false" && !!rawUrl;

let url;
if (rawUrl) {
  url = /^rediss?:\/\//i.test(rawUrl) ? rawUrl : `redis://${rawUrl}`;
}

const redisClient = createClient(url ? { url } : {});

redisClient.on("connect", () => {
  console.log("Connected to Redis");
});

redisClient.on("error", (err) => {
  console.log("Redis Client Error", err);
});

if (useRedis) {
  try {
    console.log(`Attempting Redis connection to ${url}`);
    await redisClient.connect();
  } catch (err) {
    console.error("Failed to connect to Redis", err);
  }
} else {
  console.log(
    "Redis disabled or REDIS_URL not set — skipping Redis connection (using LRU cache only)"
  );
}

/* ---------- SAFE HELPERS ---------- */

export async function get(key) {
  try {
    if (!redisClient.isOpen) return null;
    return await redisClient.get(key);
  } catch (err) {
    console.error("Redis get error", err);
    return null;
  }
}

export async function setEx(key, ttl, value) {
  try {
    if (!redisClient.isOpen) return;
    await redisClient.set(key, value, { EX: ttl });
  } catch (err) {
    console.error("Redis setEx error", err);
  }
}

export default redisClient;
