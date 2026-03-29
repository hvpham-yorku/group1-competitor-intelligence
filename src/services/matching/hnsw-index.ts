import { HNSW } from "hnsw";
import type { MatchableProduct } from "@/services/matching/types";

type EmbeddedProduct = MatchableProduct & { embedding: number[] };

type CachedIndex = {
  signature: string;
  index: HNSW;
  byId: Map<number, EmbeddedProduct>;
  projectedDimensions: number;
};

const indexCache = new Map<string, CachedIndex>();
const DEFAULT_PROJECTED_DIMENSIONS = 256;

function normalizeVector(vector: number[]): number[] {
  let magnitude = 0;
  for (const value of vector) {
    magnitude += value * value;
  }

  if (magnitude === 0) {
    return vector;
  }

  const scale = 1 / Math.sqrt(magnitude);
  return vector.map((value) => value * scale);
}

export function projectEmbeddingForIndex(
  vector: number[],
  targetDimensions = DEFAULT_PROJECTED_DIMENSIONS
): number[] {
  if (vector.length <= targetDimensions) {
    return normalizeVector([...vector]);
  }

  const projected = new Array<number>(targetDimensions).fill(0);

  for (let index = 0; index < targetDimensions; index += 1) {
    const start = Math.floor((index * vector.length) / targetDimensions);
    const end = Math.floor(((index + 1) * vector.length) / targetDimensions);
    const safeEnd = Math.max(end, start + 1);
    let total = 0;
    let count = 0;

    for (let inner = start; inner < safeEnd && inner < vector.length; inner += 1) {
      total += vector[inner];
      count += 1;
    }

    projected[index] = count > 0 ? total / count : 0;
  }

  return normalizeVector(projected);
}

function buildSignature(products: EmbeddedProduct[]): string {
  if (products.length === 0) {
    return "empty";
  }

  const dimensions = products[0]?.embedding.length ?? 0;
  const count = products.length;
  let minId = Number.POSITIVE_INFINITY;
  let maxId = Number.NEGATIVE_INFINITY;
  let latestEmbeddedAt = "";

  for (const product of products) {
    minId = Math.min(minId, product.source_product_id);
    maxId = Math.max(maxId, product.source_product_id);
    if ((product.embedded_at ?? "") > latestEmbeddedAt) {
      latestEmbeddedAt = product.embedded_at ?? "";
    }
  }

  return `${count}:${dimensions}:${minId}:${maxId}:${latestEmbeddedAt}`;
}

export async function getOrBuildHnswIndex(input: {
  cacheKey: string;
  products: EmbeddedProduct[];
}): Promise<CachedIndex | null> {
  if (input.products.length === 0) {
    return null;
  }

  const signature = buildSignature(input.products);
  const cached = indexCache.get(input.cacheKey);
  if (cached && cached.signature === signature) {
    console.log("[MatchingHNSW] cache_hit", {
      cacheKey: input.cacheKey,
      count: input.products.length,
      dimensions: input.products[0]?.embedding.length ?? 0,
      projected_dimensions: cached.projectedDimensions,
    });
    return cached;
  }

  const buildStartedAt = Date.now();
  const originalDimensions = input.products[0]?.embedding.length ?? 0;
  const projectedDimensions = Math.min(originalDimensions, DEFAULT_PROJECTED_DIMENSIONS);
  const index = new HNSW(16, 200, projectedDimensions, "cosine", 96);
  await index.buildIndex(
    input.products.map((product) => ({
      id: product.source_product_id,
      vector: projectEmbeddingForIndex(product.embedding, projectedDimensions),
    }))
  );

  const built: CachedIndex = {
    signature,
    index,
    byId: new Map(input.products.map((product) => [product.source_product_id, product])),
    projectedDimensions,
  };
  indexCache.set(input.cacheKey, built);

  console.log("[MatchingHNSW] cache_build", {
    cacheKey: input.cacheKey,
    count: input.products.length,
    dimensions: originalDimensions,
    projected_dimensions: projectedDimensions,
    duration_ms: Date.now() - buildStartedAt,
  });

  return built;
}
