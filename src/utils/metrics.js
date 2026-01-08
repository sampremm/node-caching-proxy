let hits = 0;
let misses = 0;

export function hit() {
  hits++;
}

export function miss() {
  misses++;
}

export function stats() {
  return {
    hits,
    misses,
    hitRatio: hits / Math.max(hits + misses, 1)
  };
}
