// Simple deterministic RNG utilities for AI reproducibility.
// Uses xmur3 string hash to derive seed and mulberry32 PRNG.

export type RNG = () => number;

function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number): RNG {
  return function() {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSeededRng(seed: string | number): RNG {
  if (typeof seed === "number") return mulberry32(seed >>> 0);
  const h = xmur3(String(seed));
  const s = h();
  return mulberry32(s);
}

export function pickRandomIndex(n: number, rng: RNG): number {
  return Math.floor(rng() * n);
}

export function pickRandom<T>(arr: T[], rng: RNG): T {
  const i = pickRandomIndex(arr.length, rng);
  return arr[i];
}
