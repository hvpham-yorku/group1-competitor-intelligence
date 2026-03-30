import { getOrBuildHnswIndex, projectEmbeddingForIndex } from "@/services/matching/hnsw-index";
import type {
  MatchableProduct,
  ProductMatchRecord,
  ProductMatchSuggestion,
} from "@/services/matching/types";

function cosineSimilarity(left: number[], right: number[]): number {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    dotProduct += left[index] * right[index];
    leftMagnitude += left[index] * left[index];
    rightMagnitude += right[index] * right[index];
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function tokenizeTitle(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function jaccardSimilarity(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = Array.from(leftSet).filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;

  return union === 0 ? 0 : intersection / union;
}

function overlapRatio(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = Array.from(leftSet).filter((token) => rightSet.has(token)).length;
  return intersection / Math.max(leftSet.size, rightSet.size);
}

function normalizeOptionalText(value: string | null): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";
  return normalized || null;
}

function extractMeasurementTokens(product: MatchableProduct): string[] {
  const text = [product.title, ...product.variant_titles]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matches = text.match(/\b\d+(?:\.\d+)?\s?(?:oz|ml|l|g|kg|lb|lbs|pack|pk|ct|count|cm|mm)\b/g);
  return Array.from(new Set(matches ?? []));
}

function priceAgreement(left: number | null, right: number | null): number {
  if (left == null || right == null || left <= 0 || right <= 0) {
    return 0;
  }

  const ratio = right / left;
  if (ratio >= 0.8 && ratio <= 1.2) {
    return 0.06;
  }

  if (ratio < 0.5 || ratio > 1.5) {
    return -0.08;
  }

  return 0;
}

function measurementAgreement(left: string[], right: string[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }

  const overlap = left.some((token) => right.includes(token));
  return overlap ? 0.08 : -0.08;
}

function calibrateConfidence(rawScore: number, distinctiveness: number): number {
  const centered = (rawScore - 0.61) * 4.4;
  const calibrated = 0.5 * (1 + Math.tanh(centered));
  const confidence = calibrated * (0.68 + distinctiveness * 0.32);
  return Math.max(0, Math.min(1, confidence));
}

function softmax(values: number[], temperature = 0.08): number[] {
  if (values.length === 0) {
    return [];
  }

  const scaled = values.map((value) => value / temperature);
  const maxValue = Math.max(...scaled);
  const exponentials = scaled.map((value) => Math.exp(value - maxValue));
  const total = exponentials.reduce((sum, value) => sum + value, 0);

  return total === 0 ? values.map(() => 0) : exponentials.map((value) => value / total);
}

function scoreCandidate(
  ownedProduct: EnrichedProduct,
  competitorProduct: EnrichedProduct
) {
  const cosine = cosineSimilarity(ownedProduct.embedding, competitorProduct.embedding);
  const titleSimilarity = jaccardSimilarity(ownedProduct.titleTokens, competitorProduct.titleTokens);

  let heuristicBoost = 0;
  if (ownedProduct.vendorNormalized && competitorProduct.vendorNormalized) {
    heuristicBoost += ownedProduct.vendorNormalized === competitorProduct.vendorNormalized ? 0.14 : -0.14;
  }

  if (
    ownedProduct.typeNormalized &&
    competitorProduct.typeNormalized &&
    ownedProduct.typeNormalized === competitorProduct.typeNormalized
  ) {
    heuristicBoost += 0.06;
  }

  heuristicBoost += measurementAgreement(ownedProduct.measurementTokens, competitorProduct.measurementTokens);
  heuristicBoost += priceAgreement(ownedProduct.latest_price, competitorProduct.latest_price);

  if (titleSimilarity < 0.18) {
    heuristicBoost -= 0.18;
  }

  const rawScore = Math.max(
    0,
    Math.min(1, cosine * 0.42 + titleSimilarity * 0.4 + heuristicBoost)
  );

  return {
    rawScore,
    cosine,
    titleSimilarity,
  };
}

type EnrichedProduct = MatchableProduct & {
  embedding: number[];
  titleTokens: string[];
  vendorNormalized: string | null;
  typeNormalized: string | null;
  measurementTokens: string[];
};

function enrichProduct(product: MatchableProduct & { embedding: number[] }): EnrichedProduct {
  return {
    ...product,
    titleTokens: tokenizeTitle(product.title),
    vendorNormalized: normalizeOptionalText(product.vendor),
    typeNormalized: normalizeOptionalText(product.product_type),
    measurementTokens: extractMeasurementTokens(product),
  };
}

export async function buildSuggestedMatches(input: {
  ownedProducts: Array<MatchableProduct & { embedding: number[] }>;
  competitorProducts: Array<MatchableProduct & { embedding: number[] }>;
  reviewedMatches: ProductMatchRecord[];
  limitPerOwnedProduct?: number;
}): Promise<ProductMatchSuggestion[]> {
  const startedAt = Date.now();
  const blockedPairs = new Set(
    input.reviewedMatches.map(
      (match) =>
        `${match.owned_product.source_product_id}:${match.competitor_product.source_product_id}`
    )
  );

  const rawSuggestions: ProductMatchSuggestion[] = [];
  const limitPerOwnedProduct = input.limitPerOwnedProduct ?? 3;
  const enrichedOwnedProducts = input.ownedProducts.map(enrichProduct);
  const enrichedCompetitorProducts = input.competitorProducts.map(enrichProduct);
  const competitorById = new Map(
    enrichedCompetitorProducts.map((product) => [product.source_product_id, product])
  );
  const competitorStoreDomain = input.competitorProducts[0]?.store_domain ?? "unknown-store";
  const competitorProvider = input.competitorProducts[0]?.embedding_provider ?? "unknown-provider";
  const competitorModel = input.competitorProducts[0]?.embedding_model ?? "unknown-model";
  const cachedIndex = await getOrBuildHnswIndex({
    cacheKey: `${competitorStoreDomain}:${competitorProvider}:${competitorModel}`,
    products: enrichedCompetitorProducts,
  });
  const queryStartedAt = Date.now();

  for (const ownedProduct of enrichedOwnedProducts) {
    const annCandidates = cachedIndex
      ? cachedIndex.index.searchKNN(
          projectEmbeddingForIndex(ownedProduct.embedding, cachedIndex.projectedDimensions),
          Math.min(Math.max(limitPerOwnedProduct * 12, 64), enrichedCompetitorProducts.length),
          { efSearch: Math.min(Math.max(limitPerOwnedProduct * 8, 64), 128) }
        )
      : enrichedCompetitorProducts
          .slice(0, Math.min(enrichedCompetitorProducts.length, 120))
          .map((product) => ({
            id: product.source_product_id,
            score: cosineSimilarity(ownedProduct.embedding, product.embedding),
          }));

    const candidatePool = annCandidates
      .map((candidate) => {
        const competitorProduct = competitorById.get(candidate.id);
        if (!competitorProduct) {
          return null;
        }

        return {
          competitor_product: competitorProduct,
          overlap: overlapRatio(ownedProduct.titleTokens, competitorProduct.titleTokens),
        };
      })
      .filter((candidate): candidate is { competitor_product: EnrichedProduct; overlap: number } => Boolean(candidate));

    const scoredCandidates = candidatePool
      .map((candidate) => ({
        competitor_product: candidate.competitor_product,
        ...scoreCandidate(ownedProduct, candidate.competitor_product),
        overlap: candidate.overlap,
      }))
      .filter((candidate) => {
        const key = `${ownedProduct.source_product_id}:${candidate.competitor_product.source_product_id}`;
        if (blockedPairs.has(key)) {
          return false;
        }

        return candidate.overlap >= 0.2 || candidate.rawScore >= 0.72;
      })
      .sort((left, right) => right.rawScore - left.rawScore);

    const probabilities = softmax(scoredCandidates.map((candidate) => candidate.rawScore));
    const rankedCandidates = scoredCandidates
      .map((candidate, index) => ({
        owned_product: ownedProduct,
        competitor_product: candidate.competitor_product,
        score: calibrateConfidence(candidate.rawScore, probabilities[index] ?? 0),
        method: `embedding-lexical-heuristic:${candidate.rawScore.toFixed(3)}`,
      }))
      .sort((left, right) => right.score - left.score)
      .slice(0, limitPerOwnedProduct);

    rawSuggestions.push(...rankedCandidates);
  }

  const suggestions = rawSuggestions.sort((left, right) => right.score - left.score);
  console.log("[MatchingSuggestions]", {
    owned_count: input.ownedProducts.length,
    competitor_count: input.competitorProducts.length,
    suggested_count: suggestions.length,
    limit_per_owned_product: limitPerOwnedProduct,
    query_duration_ms: Date.now() - queryStartedAt,
    duration_ms: Date.now() - startedAt,
  });
  return suggestions;
}
