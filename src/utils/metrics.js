let hits = 0;
let misses = 0;
let errors = 0;
let totalLatency = 0;
let requestCount = 0;
let cacheLayerStats = {
  redis: 0,
  lru: 0,
  miss: 0
};

export function hit(layer = 'unknown') {
  hits++;
  if (['redis', 'lru'].includes(layer)) {
    cacheLayerStats[layer]++;
  }
}

export function miss() {
  misses++;
  cacheLayerStats.miss++;
}

export function recordError() {
  errors++;
}

export function recordLatency(ms) {
  totalLatency += ms;
  requestCount++;
}

export function stats() {
  return {
    hits,
    misses,
    errors,
    totalRequests: hits + misses,
    hitRatio: hits / Math.max(hits + misses, 1),
    avgLatencyMs: requestCount > 0 ? (totalLatency / requestCount).toFixed(2) : 0,
    cacheLayerBreakdown: cacheLayerStats,
    errorRate: errors / Math.max(hits + misses + errors, 1)
  };
}

export function reset() {
  hits = 0;
  misses = 0;
  errors = 0;
  totalLatency = 0;
  requestCount = 0;
  cacheLayerStats = { redis: 0, lru: 0, miss: 0 };
}
