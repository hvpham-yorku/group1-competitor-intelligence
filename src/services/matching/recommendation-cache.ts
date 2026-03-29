import type { RecommendationGroupPayload } from "@/services/matching/types";

type CachedRecommendationSet = {
  userId: number;
  competitorStoreDomain: string;
  embeddingProvider: "openrouter" | "openai" | "local-test";
  embeddingModel: string;
  groups: RecommendationGroupPayload[];
  updatedAt: number;
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const recommendationCache = new Map<string, CachedRecommendationSet>();

function buildCacheKey(userId: number, competitorStoreDomain: string) {
  return `${userId}:${competitorStoreDomain.toLowerCase()}`;
}

export function setRecommendationCache(input: CachedRecommendationSet) {
  recommendationCache.set(
    buildCacheKey(input.userId, input.competitorStoreDomain),
    input
  );
}

export function getRecommendationCache(input: {
  userId: number;
  competitorStoreDomain: string;
}): CachedRecommendationSet | null {
  const key = buildCacheKey(input.userId, input.competitorStoreDomain);
  const cached = recommendationCache.get(key);
  if (!cached) {
    return null;
  }

  if (Date.now() - cached.updatedAt > CACHE_TTL_MS) {
    recommendationCache.delete(key);
    return null;
  }

  return cached;
}

export function paginateRecommendationGroups(input: {
  groups: RecommendationGroupPayload[];
  page?: number;
  pageSize?: number;
}) {
  const pageSize = Math.max(1, Math.min(input.pageSize ?? 100, 200));
  const page = Math.max(1, input.page ?? 1);
  const totalGroups = input.groups.length;
  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));
  const normalizedPage = Math.min(page, totalPages);
  const offset = (normalizedPage - 1) * pageSize;

  return {
    page: normalizedPage,
    page_size: pageSize,
    total_groups: totalGroups,
    total_pages: totalPages,
    suggestions: input.groups.slice(offset, offset + pageSize),
  };
}
