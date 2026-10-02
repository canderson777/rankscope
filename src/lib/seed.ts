/**
 * Deterministic pseudo-random generation seeded by a string.
 * The same query always produces the same mock data, so the app
 * feels like it's backed by a real index. Swap the data layer for
 * real API calls later without touching the UI.
 */

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  private next: () => number;

  constructor(seed: string) {
    this.next = mulberry32(xmur3(seed.toLowerCase().trim())());
  }

  /** Float in [0, 1) */
  float(): number {
    return this.next();
  }

  /** Integer in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Float in [min, max) */
  range(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  /** Pick n distinct items (n capped at arr.length) */
  sample<T>(arr: readonly T[], n: number): T[] {
    const copy = [...arr];
    const out: T[] = [];
    while (out.length < n && copy.length > 0) {
      out.push(copy.splice(Math.floor(this.next() * copy.length), 1)[0]);
    }
    return out;
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  /** True with probability p */
  chance(p: number): boolean {
    return this.next() < p;
  }

  /**
   * A 12-point series that drifts around a base value with gentle
   * momentum — reads like a real monthly metric, not white noise.
   */
  series(base: number, volatility = 0.12, drift = 0.015, points = 12): number[] {
    const out: number[] = [];
    let v = base * this.range(0.75, 0.95);
    for (let i = 0; i < points; i++) {
      v = v * (1 + drift) + base * this.range(-volatility, volatility);
      v = Math.max(base * 0.3, v);
      out.push(Math.round(v));
    }
    return out;
  }
}

/** Stable hash → int in [min, max], no Rng state consumed */
export function hashInt(seed: string, min: number, max: number): number {
  const h = xmur3(seed.toLowerCase().trim())();
  return (h % (max - min + 1)) + min;
}

/** Last n month labels ending this month, e.g. "Aug '25" */
export function monthLabels(n = 12): string[] {
  const now = new Date(2026, 6, 1); // anchor so mock data is stable
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${fmt.format(d)} '${String(d.getFullYear()).slice(2)}`);
  }
  return out;
}
