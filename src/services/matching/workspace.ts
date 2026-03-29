import {
  deleteProductMatchDecision,
  deleteProductMatchDecisionsForOwnedProduct,
  getEmbeddedProductsByStore,
  getMatchableProductsByIds,
  getMatchableProductsByStore,
  getMatchingStores,
  getPagedMatchableProductsByStore,
  getStoreEmbeddingCoverage,
  getTitleMatchCandidatesByStore,
  listProductMatches,
  listProductMatchesForOwnedProducts,
  upsertProductMatchDecision,
  upsertProductEmbedding,
} from "@/persistence/matching-repository";
import { searchProducts } from "@/services/products/search-products";
import type { ProductSearchResult } from "@/services/products/search-types";
import {
  generateEmbeddings,
  getConfiguredEmbeddingProvider,
} from "@/services/matching/embedding-provider";
import {
  getRecommendationCache,
  paginateRecommendationGroups,
  setRecommendationCache,
} from "@/services/matching/recommendation-cache";
import {
  getTitleMatchCache,
  setTitleMatchCache,
} from "@/services/matching/title-match-cache";
import { buildSuggestedMatches } from "@/services/matching/suggestions";
import type {
  EmbeddingSyncResult,
  GenerateRecommendationsResult,
  MatchableProduct,
  MatchingEmbeddingStatus,
  RecommendationPagePayload,
  RecommendationGroupPayload,
  ProductMatchRecord,
  ProductMatchSuggestion,
  MatchingWorkspace,
} from "@/services/matching/types";

const DEFAULT_CONFIDENCE_THRESHOLD = 0.82;

function buildEmbeddingInput(product: MatchableProduct): string {
  const variantText = product.variant_titles.filter(Boolean).join(" | ");
  const measurementTokens = extractMeasurementTokens([product.title, variantText].filter(Boolean).join(" "));

  return [
    `title: ${product.title}`,
    product.vendor ? `vendor: ${product.vendor}` : null,
    product.product_type ? `type: ${product.product_type}` : null,
    variantText ? `variants: ${variantText}` : null,
    measurementTokens.length > 0 ? `measurements: ${measurementTokens.join(" | ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function extractMeasurementTokens(text: string): string[] {
  const matches = text
    .toLowerCase()
    .match(/\b\d+(?:\.\d+)?\s?(?:oz|ml|l|g|kg|lb|lbs|pack|pk|ct|count|cm|mm)\b/g);

  return Array.from(new Set(matches ?? []));
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

function toRecommendationPreview(product: MatchableProduct) {
  return {
    source_product_id: product.source_product_id,
    store_domain: product.store_domain,
    title: product.title,
    product_url: product.product_url,
    image_url: product.image_url,
    vendor: product.vendor,
    product_type: product.product_type,
    latest_price: product.latest_price,
  };
}

function buildRecommendationGroups(
  suggestions: ProductMatchSuggestion[]
): RecommendationGroupPayload[] {
  const groups = new Map<number, RecommendationGroupPayload>();

  for (const suggestion of suggestions) {
    const key = suggestion.owned_product.source_product_id;
    const existing = groups.get(key);
    const candidate = {
      competitor_product: toRecommendationPreview(suggestion.competitor_product),
      score: suggestion.score,
      method: suggestion.method,
    };

    if (existing) {
      existing.candidates.push(candidate);
      continue;
    }

    groups.set(key, {
      owned_product: toRecommendationPreview(suggestion.owned_product),
      candidates: [candidate],
    });
  }

  return Array.from(groups.values());
}

function tokenizeForTitleMatch(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function normalizeTitleForMatch(text: string): string {
  return tokenizeForTitleMatch(text).join(" ");
}

function titleOverlapDetails(left: string[], right: string[]) {
  if (left.length === 0 || right.length === 0) {
    return {
      score: 0,
      sharedTokens: 0,
    };
  }

  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const sharedTokens = Array.from(leftSet).filter((token) => rightSet.has(token)).length;

  return {
    score: sharedTokens / Math.max(leftSet.size, rightSet.size),
    sharedTokens,
  };
}

function buildClosestTitleMatches(input: {
  ownedProducts: MatchableProduct[];
  competitorProducts: MatchableProduct[];
}): ProductMatchSuggestion[] {
  const minimumScore = 0.5;
  const tokenizedCompetitors = input.competitorProducts.map((product) => ({
    product,
    tokens: tokenizeForTitleMatch(product.title),
    normalizedTitle: normalizeTitleForMatch(product.title),
  }));

  return input.ownedProducts
    .map((ownedProduct) => {
      const ownedTokens = tokenizeForTitleMatch(ownedProduct.title);
      const normalizedOwnedTitle = normalizeTitleForMatch(ownedProduct.title);
      let bestMatch: MatchableProduct | null = null;
      let bestScore = 0;
      let bestSharedTokens = 0;
      let bestIsExactNormalizedMatch = false;

      for (const competitor of tokenizedCompetitors) {
        const isExactNormalizedMatch =
          normalizedOwnedTitle.length > 0 && normalizedOwnedTitle === competitor.normalizedTitle;
        const { score, sharedTokens } = titleOverlapDetails(ownedTokens, competitor.tokens);

        if (!isExactNormalizedMatch && (sharedTokens < 2 || score < minimumScore)) {
          continue;
        }

        if (score > bestScore) {
          bestScore = score;
          bestMatch = competitor.product;
          bestSharedTokens = sharedTokens;
          bestIsExactNormalizedMatch = isExactNormalizedMatch;
        }
      }

      if (
        !bestMatch ||
        (!bestIsExactNormalizedMatch && (bestSharedTokens < 2 || bestScore < minimumScore))
      ) {
        return null;
      }

      return {
        owned_product: ownedProduct,
        competitor_product: bestMatch,
        score: bestScore,
        method: "title-overlap",
      };
    })
    .filter((suggestion): suggestion is ProductMatchSuggestion => suggestion !== null);
}

async function resolveActiveEmbeddingConfig(input: {
  userId: number;
  ownedStoreDomain: string;
  competitorStoreDomain: string;
}) {
  const configured = getConfiguredEmbeddingProvider();
  const [ownedCoverage, competitorCoverage] = await Promise.all([
    getStoreEmbeddingCoverage({
      userId: input.userId,
      storeDomain: input.ownedStoreDomain,
    }),
    getStoreEmbeddingCoverage({
      userId: input.userId,
      storeDomain: input.competitorStoreDomain,
    }),
  ]);

  const configuredOwned = ownedCoverage.find(
    (entry) => entry.provider === configured.provider && entry.model === configured.model
  );
  const configuredCompetitor = competitorCoverage.find(
    (entry) => entry.provider === configured.provider && entry.model === configured.model
  );

  if (configuredOwned && configuredCompetitor) {
    return configured;
  }

  const competitorByKey = new Map(
    competitorCoverage.map((entry) => [`${entry.provider}::${entry.model}`, entry])
  );

  const bestShared = ownedCoverage
    .map((entry) => {
      const competitorEntry = competitorByKey.get(`${entry.provider}::${entry.model}`);
      if (!competitorEntry) {
        return null;
      }

      return {
        provider: entry.provider as "openrouter" | "openai" | "local-test",
        model: entry.model,
        sharedCount: Math.min(entry.product_count, competitorEntry.product_count),
      };
    })
    .filter((entry): entry is { provider: "openrouter" | "openai" | "local-test"; model: string; sharedCount: number } => Boolean(entry))
    .sort((left, right) => right.sharedCount - left.sharedCount)[0];

  return bestShared
    ? { provider: bestShared.provider, model: bestShared.model }
    : configured;
}

async function buildEmbeddingStatus(input: {
  userId: number;
  ownedStore: MatchStoreSummary;
  competitorStore: MatchStoreSummary;
}): Promise<MatchingEmbeddingStatus> {
  const activeConfig = await resolveActiveEmbeddingConfig({
    userId: input.userId,
    ownedStoreDomain: input.ownedStore.store_domain,
    competitorStoreDomain: input.competitorStore.store_domain,
  });

  const [ownedCoverage, competitorCoverage] = await Promise.all([
    getStoreEmbeddingCoverage({
      userId: input.userId,
      storeDomain: input.ownedStore.store_domain,
    }),
    getStoreEmbeddingCoverage({
      userId: input.userId,
      storeDomain: input.competitorStore.store_domain,
    }),
  ]);

  const ownedCached = Math.min(
    ownedCoverage.find(
      (entry) => entry.provider === activeConfig.provider && entry.model === activeConfig.model
    )?.product_count ?? 0,
    input.ownedStore.product_count
  );

  const competitorCached = Math.min(
    competitorCoverage.find(
      (entry) => entry.provider === activeConfig.provider && entry.model === activeConfig.model
    )?.product_count ?? 0,
    input.competitorStore.product_count
  );

  return {
    provider: activeConfig.provider,
    model: activeConfig.model,
    owned_store_domain: input.ownedStore.store_domain,
    owned_total_products: input.ownedStore.product_count,
    owned_cached_embeddings: ownedCached,
    owned_missing_embeddings: Math.max(0, input.ownedStore.product_count - ownedCached),
    competitor_store_domain: input.competitorStore.store_domain,
    competitor_total_products: input.competitorStore.product_count,
    competitor_cached_embeddings: competitorCached,
    competitor_missing_embeddings: Math.max(0, input.competitorStore.product_count - competitorCached),
  };
}

export async function getMatchingWorkspace(input: {
  userId: number;
  storeDomain?: string | null;
  confidenceThreshold?: number;
  includeSuggestions?: boolean;
  page?: number;
  pageSize?: number;
  titleQuery?: string;
  matchFilter?: "all" | "matched" | "unmatched";
}): Promise<MatchingWorkspace> {
  const startedAt = Date.now();
  const stageStartedAt = Date.now();
  const stores = await getMatchingStores(input.userId);
  const storesLoadedAt = Date.now();
  const ownedStore = stores.find((store) => store.is_owned_store) ?? null;
  const defaultCompetitorStore =
    stores.find((store) => !store.is_owned_store && store.product_count > 0) ?? null;
  const selectedStore =
    stores.find((store) => store.store_domain === input.storeDomain) ??
    defaultCompetitorStore ??
    ownedStore ??
    null;

  const confidenceThreshold = input.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const pageSize = Math.max(1, Math.min(input.pageSize ?? 20, 100));
  const page = Math.max(1, input.page ?? 1);
  const titleQuery = input.titleQuery?.trim() ?? "";
  const matchFilter = input.matchFilter ?? "all";
  const embeddingStatus =
    ownedStore && selectedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? await buildEmbeddingStatus({
          userId: input.userId,
          ownedStore,
          competitorStore: selectedStore,
        })
      : null;
  const ownedPage =
    ownedStore && selectedStore
      ? await getPagedMatchableProductsByStore({
          userId: input.userId,
          storeDomain: ownedStore.store_domain,
          competitorStoreDomain: selectedStore.store_domain,
          matchFilter,
          titleQuery,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        })
      : { products: [], total: 0 };
  const ownedPageLoadedAt = Date.now();
  const ownedProducts = ownedPage.products;
  const currentPageMatchRows =
    selectedStore && ownedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? await listProductMatchesForOwnedProducts({
          userId: input.userId,
          competitorStoreDomain: selectedStore.store_domain,
          ownedSourceProductIds: ownedProducts.map((product) => product.source_product_id),
        })
      : [];
  const currentPageMatchesLoadedAt = Date.now();

  const reviewedMatches =
    selectedStore && ownedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? mapRecordsToMatches({
          records: currentPageMatchRows,
          ownedProducts,
          competitorProducts: await getMatchableProductsByIds({
            sourceProductIds: currentPageMatchRows.map((record) => record.competitor_source_product_id),
          }),
        })
      : [];
  const cachedTitleCandidates =
    selectedStore && ownedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? getTitleMatchCache({
          userId: input.userId,
          storeDomain: selectedStore.store_domain,
        })
      : null;
  const competitorTitleProducts =
    selectedStore && ownedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? cachedTitleCandidates ??
        (await getTitleMatchCandidatesByStore({
          userId: input.userId,
          storeDomain: selectedStore.store_domain,
        }))
      : [];

  if (
    selectedStore &&
    ownedStore &&
    selectedStore.store_domain !== ownedStore.store_domain &&
    !cachedTitleCandidates
  ) {
    setTitleMatchCache({
      userId: input.userId,
      storeDomain: selectedStore.store_domain,
      products: competitorTitleProducts,
    });
  }

  const titleSuggestedMatches =
    selectedStore && ownedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? buildClosestTitleMatches({
          ownedProducts,
          competitorProducts: competitorTitleProducts,
        })
      : [];
  const titleSuggestionsBuiltAt = Date.now();

  const activeEmbeddingConfig =
    input.includeSuggestions !== false &&
    embeddingStatus
      ? {
          provider: embeddingStatus.provider,
          model: embeddingStatus.model,
        }
      : getConfiguredEmbeddingProvider();

  const suggestedMatches =
    input.includeSuggestions !== false &&
    ownedStore && selectedStore && selectedStore.store_domain !== ownedStore.store_domain
      ? await buildSuggestedMatches({
          ownedProducts: await getEmbeddedProductsByStore({
            userId: input.userId,
            storeDomain: ownedStore.store_domain,
            provider: activeEmbeddingConfig.provider,
            model: activeEmbeddingConfig.model,
          }),
          competitorProducts: await getEmbeddedProductsByStore({
            userId: input.userId,
            storeDomain: selectedStore.store_domain,
            provider: activeEmbeddingConfig.provider,
            model: activeEmbeddingConfig.model,
          }),
          reviewedMatches,
          limitPerOwnedProduct: 20,
        })
      : [];

  console.log("[MatchingWorkspace]", {
    selected_store: selectedStore?.store_domain ?? null,
    page,
    page_size: pageSize,
    total_owned_products: ownedPage.total,
    include_suggestions: input.includeSuggestions !== false,
    suggested_matches: suggestedMatches.length,
    stores_ms: storesLoadedAt - stageStartedAt,
    owned_page_ms: ownedPageLoadedAt - storesLoadedAt,
    reviewed_matches_ms: currentPageMatchesLoadedAt - ownedPageLoadedAt,
    title_defaults_ms: titleSuggestionsBuiltAt - currentPageMatchesLoadedAt,
    duration_ms: Date.now() - startedAt,
  });

  return {
    owned_store: ownedStore,
    stores,
    selected_store: selectedStore,
    page,
    page_size: pageSize,
    total_owned_products: ownedPage.total,
    title_query: titleQuery,
    match_filter: matchFilter,
    owned_products: ownedProducts,
    competitor_products: [],
    title_suggested_matches: titleSuggestedMatches,
    suggested_matches: suggestedMatches,
    reviewed_matches: reviewedMatches,
    confidence_threshold: confidenceThreshold,
    embedding_provider: activeEmbeddingConfig.provider,
    embedding_model: activeEmbeddingConfig.model,
    embedding_status: embeddingStatus,
  };
}

export async function syncStoreEmbeddings(input: {
  userId: number;
  storeDomain: string;
  overwrite?: boolean;
  provider?: "openrouter" | "openai" | "local-test";
  model?: string;
  expectedProductCount?: number;
}): Promise<EmbeddingSyncResult> {
  const targetProvider =
    input.provider && input.model
      ? { provider: input.provider, model: input.model }
      : getConfiguredEmbeddingProvider();
  let activeProvider: EmbeddingSyncResult["provider"] = targetProvider.provider;
  let activeModel = targetProvider.model;

  if (!input.overwrite && typeof input.expectedProductCount === "number" && input.expectedProductCount > 0) {
    const coverage = await getStoreEmbeddingCoverage({
      userId: input.userId,
      storeDomain: input.storeDomain,
    });
    const compatibleCoverage = coverage.find(
      (entry) => entry.provider === targetProvider.provider && entry.model === targetProvider.model
    );

    if ((compatibleCoverage?.product_count ?? 0) >= input.expectedProductCount) {
      return {
        store_domain: input.storeDomain,
        processed_products: input.expectedProductCount,
        generated_embeddings: 0,
        skipped_existing_embeddings: input.expectedProductCount,
        provider: activeProvider,
        model: activeModel,
      };
    }
  }

  const products = await getMatchableProductsByStore({
    userId: input.userId,
    storeDomain: input.storeDomain,
  });

  let generatedEmbeddings = 0;
  let skippedExistingEmbeddings = 0;
  const batchSize =
    targetProvider.provider === "openrouter"
      ? 256
      : targetProvider.provider === "openai"
        ? 128
        : 256;
  const pendingProducts = products.filter((product) => {
    const hasCompatibleEmbedding =
      Boolean(product.embedding_provider && product.embedding_model && product.embedded_at) &&
      product.embedding_provider === targetProvider.provider &&
      product.embedding_model === targetProvider.model;

    if (hasCompatibleEmbedding && !input.overwrite) {
      skippedExistingEmbeddings += 1;
      return false;
    }

    return true;
  });

  for (let index = 0; index < pendingProducts.length; index += batchSize) {
    const chunk = pendingProducts.slice(index, index + batchSize);
    const embeddingInputs = chunk.map((product) => buildEmbeddingInput(product));
    const embeddings = await generateEmbeddings(embeddingInputs, targetProvider);

    for (let chunkIndex = 0; chunkIndex < chunk.length; chunkIndex += 1) {
      const product = chunk[chunkIndex];
      const embedding = embeddings[chunkIndex];
      if (!embedding) {
        continue;
      }

      activeProvider = embedding.provider;
      activeModel = embedding.model;

      await upsertProductEmbedding({
        sourceProductId: product.source_product_id,
        provider: embedding.provider,
        model: embedding.model,
        dimensions: embedding.vector.length,
        inputText: embeddingInputs[chunkIndex],
        embedding: embedding.vector,
      });

      generatedEmbeddings += 1;
    }
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

export async function generateRecommendations(input: {
  userId: number;
  competitorStoreDomain: string;
  page?: number;
  pageSize?: number;
}): Promise<GenerateRecommendationsResult> {
  const startedAt = Date.now();
  const stores = await getMatchingStores(input.userId);
  const ownedStore = stores.find((store) => store.is_owned_store) ?? null;

  if (!ownedStore) {
    throw new Error("Set your store first before generating recommendations");
  }

  const selectedStore = stores.find((store) => store.store_domain === input.competitorStoreDomain);
  if (!selectedStore) {
    throw new Error("Competitor store not found");
  }

  const resolveStartedAt = Date.now();
  const activeEmbeddingConfig = await resolveActiveEmbeddingConfig({
    userId: input.userId,
    ownedStoreDomain: ownedStore.store_domain,
    competitorStoreDomain: selectedStore.store_domain,
  });
  const resolveConfigMs = Date.now() - resolveStartedAt;
  console.log("[MatchingGenerate] resolve_config", {
    owned_store: ownedStore.store_domain,
    competitor_store: selectedStore.store_domain,
    provider: activeEmbeddingConfig.provider,
    model: activeEmbeddingConfig.model,
    duration_ms: resolveConfigMs,
  });

  const syncStartedAt = Date.now();
  const ownedSync =
    ownedStore.store_domain === selectedStore.store_domain
      ? null
      : await syncStoreEmbeddings({
          userId: input.userId,
          storeDomain: ownedStore.store_domain,
          overwrite: false,
          provider: activeEmbeddingConfig.provider,
          model: activeEmbeddingConfig.model,
          expectedProductCount: ownedStore.product_count,
        });

  const competitorSync = await syncStoreEmbeddings({
    userId: input.userId,
    storeDomain: selectedStore.store_domain,
    overwrite: false,
    provider: activeEmbeddingConfig.provider,
    model: activeEmbeddingConfig.model,
    expectedProductCount: selectedStore.product_count,
  });
  const syncEmbeddingsMs = Date.now() - syncStartedAt;
  console.log("[MatchingGenerate] sync_embeddings", {
    owned_generated: ownedSync?.generated_embeddings ?? 0,
    owned_skipped: ownedSync?.skipped_existing_embeddings ?? 0,
    competitor_generated: competitorSync.generated_embeddings,
    competitor_skipped: competitorSync.skipped_existing_embeddings,
    duration_ms: syncEmbeddingsMs,
  });

  const loadStartedAt = Date.now();
  const [ownedProducts, competitorProducts, reviewedMatches] = await Promise.all([
    getEmbeddedProductsByStore({
      userId: input.userId,
      storeDomain: ownedStore.store_domain,
      provider: activeEmbeddingConfig.provider,
      model: activeEmbeddingConfig.model,
    }),
    getEmbeddedProductsByStore({
      userId: input.userId,
      storeDomain: selectedStore.store_domain,
      provider: activeEmbeddingConfig.provider,
      model: activeEmbeddingConfig.model,
    }),
    listProductMatches({
      userId: input.userId,
      competitorStoreDomain: selectedStore.store_domain,
    }),
  ]);
  const loadInputsMs = Date.now() - loadStartedAt;
  console.log("[MatchingGenerate] load_inputs", {
    owned_count: ownedProducts.length,
    competitor_count: competitorProducts.length,
    reviewed_matches: reviewedMatches.length,
    duration_ms: loadInputsMs,
  });

  const suggestionStartedAt = Date.now();
  const suggestions = await buildSuggestedMatches({
    ownedProducts,
    competitorProducts,
    reviewedMatches: mapRecordsToMatches({
      records: reviewedMatches,
      ownedProducts,
      competitorProducts,
    }),
    limitPerOwnedProduct: 20,
  });
  const groupedSuggestions = buildRecommendationGroups(suggestions);
  const buildSuggestionsMs = Date.now() - suggestionStartedAt;
  const totalMs = Date.now() - startedAt;
  console.log("[MatchingGenerate] build_suggestions", {
    raw_suggestions: suggestions.length,
    grouped_suggestions: groupedSuggestions.length,
    duration_ms: buildSuggestionsMs,
    total_duration_ms: totalMs,
  });
  setRecommendationCache({
    userId: input.userId,
    competitorStoreDomain: selectedStore.store_domain,
    embeddingProvider: activeEmbeddingConfig.provider,
    embeddingModel: activeEmbeddingConfig.model,
    groups: groupedSuggestions,
    updatedAt: Date.now(),
  });

  return {
    owned_sync: ownedSync,
    competitor_sync: competitorSync,
    ...paginateRecommendationGroups({
      groups: groupedSuggestions,
      page: input.page,
      pageSize: input.pageSize,
    }),
    embedding_provider: activeEmbeddingConfig.provider,
    embedding_model: activeEmbeddingConfig.model,
    stage_timings: {
      resolve_config_ms: resolveConfigMs,
      sync_embeddings_ms: syncEmbeddingsMs,
      load_inputs_ms: loadInputsMs,
      build_suggestions_ms: buildSuggestionsMs,
      total_ms: totalMs,
    },
  };
}

export async function getRecommendationPage(input: {
  userId: number;
  competitorStoreDomain: string;
  page?: number;
  pageSize?: number;
}): Promise<RecommendationPagePayload> {
  const cached = getRecommendationCache({
    userId: input.userId,
    competitorStoreDomain: input.competitorStoreDomain,
  });

  if (!cached) {
    throw new Error("No cached recommendations found. Generate recommendations first.");
  }

  return paginateRecommendationGroups({
    groups: cached.groups,
    page: input.page,
    pageSize: input.pageSize,
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

  return results.items.map(mapSearchResultToMatchableProduct);
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

