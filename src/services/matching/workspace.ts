import {
  deleteProductMatchDecision,
  deleteProductMatchDecisionsForOwnedProduct,
  getEmbeddedProductsByStore,
  getMatchableProductsByStore,
  getMatchingStores,
  listProductMatches,
  upsertProductMatchDecision,
  upsertProductEmbedding,
} from "@/persistence/matching-repository";
import { searchProducts } from "@/services/products/search-products";
import type { ProductSearchResult } from "@/services/products/search-types";
import {
  generateEmbedding,
  getConfiguredEmbeddingProvider,
} from "@/services/matching/embedding-provider";
import type {
  EmbeddingSyncResult,
  MatchableProduct,
  ProductMatchRecord,
  ProductMatchSuggestion,
  MatchingWorkspace,
} from "@/services/matching/types";

const DEFAULT_CONFIDENCE_THRESHOLD = 0.82;

function buildEmbeddingInput(product: MatchableProduct): string {
  const variantText = product.variant_titles.filter(Boolean).join(" | ");

  return [
    `store: ${product.store_domain}`,
    `title: ${product.title}`,
    product.vendor ? `vendor: ${product.vendor}` : null,
    product.product_type ? `type: ${product.product_type}` : null,
    variantText ? `variants: ${variantText}` : null,
    product.latest_price != null ? `latest_price: ${product.latest_price}` : null,
    `url: ${product.product_url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

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

function mapRecordsToMatches(input: {
  records: Awaited<ReturnType<typeof listProductMatches>>;
  ownedProducts: MatchableProduct[];
  competitorProducts: MatchableProduct[];
}): ProductMatchRecord[] {
  const ownedById = new Map(input.ownedProducts.map((product) => [product.source_product_id, product]));
  const competitorById = new Map(
    input.competitorProducts.map((product) => [product.source_product_id, product])
  );

  return input.records
    .map((record) => {
      const ownedProduct = ownedById.get(record.owned_source_product_id);
      const competitorProduct = competitorById.get(record.competitor_source_product_id);
      if (!ownedProduct || !competitorProduct) {
        return null;
      }

      return {
        owned_product: ownedProduct,
        competitor_product: competitorProduct,
        score: record.score,
        method: record.method,
        status: record.status,
        updated_at: record.updated_at,
      };
    })
    .filter((record): record is ProductMatchRecord => record !== null);
}

function buildSuggestedMatches(input: {
  ownedProducts: Array<MatchableProduct & { embedding: number[] }>;
  competitorProducts: Array<MatchableProduct & { embedding: number[] }>;
  reviewedMatches: ProductMatchRecord[];
  threshold: number;
}): ProductMatchSuggestion[] {
  const blockedPairs = new Set(
    input.reviewedMatches.map(
      (match) =>
        `${match.owned_product.source_product_id}:${match.competitor_product.source_product_id}`
    )
  );

  const rawSuggestions: ProductMatchSuggestion[] = [];
  for (const competitorProduct of input.competitorProducts) {
    let bestCandidate: ProductMatchSuggestion | null = null;

    for (const ownedProduct of input.ownedProducts) {
      const score = cosineSimilarity(ownedProduct.embedding, competitorProduct.embedding);
      if (score < input.threshold) {
        continue;
      }

      const candidate: ProductMatchSuggestion = {
        owned_product: ownedProduct,
        competitor_product: competitorProduct,
        score,
        method: "embedding-cosine",
      };

      if (!bestCandidate || candidate.score > bestCandidate.score) {
        bestCandidate = candidate;
      }
    }

    if (bestCandidate) {
      rawSuggestions.push(bestCandidate);
    }
  }

  const usedOwnedProducts = new Set<number>();
  const usedCompetitorProducts = new Set<number>();

  return rawSuggestions
    .filter((suggestion) => {
      const key = `${suggestion.owned_product.source_product_id}:${suggestion.competitor_product.source_product_id}`;
      return !blockedPairs.has(key);
    })
    .sort((left, right) => right.score - left.score)
    .filter((suggestion) => {
      if (
        usedOwnedProducts.has(suggestion.owned_product.source_product_id) ||
        usedCompetitorProducts.has(suggestion.competitor_product.source_product_id)
      ) {
        return false;
      }

      usedOwnedProducts.add(suggestion.owned_product.source_product_id);
      usedCompetitorProducts.add(suggestion.competitor_product.source_product_id);
      return true;
    });
}

export async function getMatchingWorkspace(input: {
  userId: number;
  storeDomain?: string | null;
  confidenceThreshold?: number;
}): Promise<MatchingWorkspace> {
  const stores = await getMatchingStores(input.userId);
  const ownedStore = stores.find((store) => store.is_owned_store) ?? null;
  const defaultCompetitorStore =
    stores.find((store) => !store.is_owned_store && store.product_count > 0) ?? null;
  const selectedStore =
    stores.find((store) => store.store_domain === input.storeDomain) ??
    defaultCompetitorStore ??
    ownedStore ??
    null;

  const products = selectedStore
    ? await getMatchableProductsByStore({
        userId: input.userId,
        storeDomain: selectedStore.store_domain,
      })
    : [];

  const confidenceThreshold = input.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const ownedProducts =
    ownedStore && selectedStore
      ? await getMatchableProductsByStore({
          userId: input.userId,
          storeDomain: ownedStore.store_domain,
        })
      : [];

  const reviewedMatches =
    selectedStore && ownedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? mapRecordsToMatches({
          records: await listProductMatches({
            userId: input.userId,
            competitorStoreDomain: selectedStore.store_domain,
          }),
          ownedProducts,
          competitorProducts: products,
        })
      : [];

  const suggestedMatches =
    ownedStore && selectedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? buildSuggestedMatches({
          ownedProducts: await getEmbeddedProductsByStore({
            userId: input.userId,
            storeDomain: ownedStore.store_domain,
          }),
          competitorProducts: await getEmbeddedProductsByStore({
            userId: input.userId,
            storeDomain: selectedStore.store_domain,
          }),
          reviewedMatches,
          threshold: confidenceThreshold,
        })
      : [];

  const provider = getConfiguredEmbeddingProvider();

  return {
    owned_store: ownedStore,
    stores,
    selected_store: selectedStore,
    owned_products: ownedProducts,
    competitor_products: products,
    suggested_matches: suggestedMatches,
    reviewed_matches: reviewedMatches,
    confidence_threshold: confidenceThreshold,
    embedding_provider: provider.provider,
    embedding_model: provider.model,
  };
}

export async function syncStoreEmbeddings(input: {
  userId: number;
  storeDomain: string;
  overwrite?: boolean;
}): Promise<EmbeddingSyncResult> {
  const products = await getMatchableProductsByStore({
    userId: input.userId,
    storeDomain: input.storeDomain,
  });

  let generatedEmbeddings = 0;
  let skippedExistingEmbeddings = 0;
  let activeProvider: EmbeddingSyncResult["provider"] = "local-test";
  let activeModel = getConfiguredEmbeddingProvider().model;

  for (const product of products) {
    const hasEmbedding = Boolean(product.embedding_provider && product.embedding_model && product.embedded_at);
    if (hasEmbedding && !input.overwrite) {
      skippedExistingEmbeddings += 1;
      continue;
    }

    const embeddingInput = buildEmbeddingInput(product);
    const embedding = await generateEmbedding(embeddingInput);
    activeProvider = embedding.provider;
    activeModel = embedding.model;

    await upsertProductEmbedding({
      sourceProductId: product.source_product_id,
      provider: embedding.provider,
      model: embedding.model,
      dimensions: embedding.vector.length,
      inputText: embeddingInput,
      embedding: embedding.vector,
    });

    generatedEmbeddings += 1;
  }

  return {
    store_domain: input.storeDomain,
    processed_products: products.length,
    generated_embeddings: generatedEmbeddings,
    skipped_existing_embeddings: skippedExistingEmbeddings,
    provider: activeProvider,
    model: activeModel,
  };
}

export async function reviewProductMatch(input: {
  userId: number;
  ownedSourceProductId: number;
  competitorSourceProductId: number;
  score: number;
  method: string;
  status: "approved" | "rejected";
}): Promise<void> {
  await upsertProductMatchDecision({
    userId: input.userId,
    ownedSourceProductId: input.ownedSourceProductId,
    competitorSourceProductId: input.competitorSourceProductId,
    score: input.score,
    method: input.method,
    status: input.status,
  });
}

export async function setProductMatch(input: {
  userId: number;
  ownedSourceProductId: number;
  competitorSourceProductId: number;
}): Promise<void> {
  await deleteProductMatchDecisionsForOwnedProduct({
    userId: input.userId,
    ownedSourceProductId: input.ownedSourceProductId,
  });

  await upsertProductMatchDecision({
    userId: input.userId,
    ownedSourceProductId: input.ownedSourceProductId,
    competitorSourceProductId: input.competitorSourceProductId,
    score: 1,
    method: "manual-selection",
    status: "approved",
  });
}

export async function unmatchProduct(input: {
  userId: number;
  ownedSourceProductId: number;
  competitorSourceProductId: number;
}): Promise<void> {
  await deleteProductMatchDecision(input);
}

export async function searchCompetitorProducts(input: {
  userId: number;
  storeDomain: string;
  query: string;
  limit?: number;
}): Promise<MatchableProduct[]> {
  const results = await searchProducts({
    userId: input.userId,
    query: input.query,
    storeDomain: input.storeDomain,
    limit: input.limit,
  });

  return results.map(mapSearchResultToMatchableProduct);
}

function mapSearchResultToMatchableProduct(result: ProductSearchResult): MatchableProduct {
  return {
    source_product_id: result.source_product_id,
    store_domain: result.store_domain,
    title: result.title,
    product_url: result.product_url,
    image_url: result.image_url,
    vendor: result.vendor,
    product_type: result.product_type,
    variant_titles: [],
    latest_price: result.latest_price,
    latest_observed_at: result.latest_observed_at,
    embedding_provider: null,
    embedding_model: null,
    embedding_dimensions: null,
    embedded_at: null,
  };
}
