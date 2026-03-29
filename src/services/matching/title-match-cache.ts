import type { MatchableProduct } from "@/services/matching/types";

type CacheEntry = {
  createdAt: number;
  products: MatchableProduct[];
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, CacheEntry>();

function keyOf(input: { userId: number; storeDomain: string }) {
  return `${input.userId}::${input.storeDomain}`;
}

export function getTitleMatchCache(input: {
  userId: number;
  storeDomain: string;
}): MatchableProduct[] | null {
  const key = keyOf(input);
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return entry.products;
}

export function setTitleMatchCache(input: {
  userId: number;
  storeDomain: string;
  products: MatchableProduct[];
}) {
  cache.set(keyOf(input), {
    createdAt: Date.now(),
    products: input.products,
  });
}

export function clearTitleMatchCache(input?: { userId?: number; storeDomain?: string }) {
  if (!input) {
    cache.clear();
    return;
  }

  for (const key of cache.keys()) {
    const [userId, storeDomain] = key.split("::");
    if (
      (input.userId === undefined || Number(userId) === input.userId) &&
      (input.storeDomain === undefined || storeDomain === input.storeDomain)
    ) {
      cache.delete(key);
    }
  }
}
