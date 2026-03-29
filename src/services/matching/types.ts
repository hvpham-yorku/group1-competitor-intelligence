export type MatchStoreSummary = {
  store_domain: string;
  is_owned_store: boolean;
  product_count: number;
  embedded_product_count: number;
  latest_scraped_at: string | null;
};

export type MatchableProduct = {
  source_product_id: number;
  store_domain: string;
  title: string;
  product_url: string;
  image_url: string | null;
  vendor: string | null;
  product_type: string | null;
  variant_titles: string[];
  latest_price: number | null;
  latest_observed_at: string | null;
  embedding_provider: string | null;
  embedding_model: string | null;
  embedding_dimensions: number | null;
  embedded_at: string | null;
};

export type MatchingWorkspace = {
  owned_store: MatchStoreSummary | null;
  stores: MatchStoreSummary[];
  selected_store: MatchStoreSummary | null;
  page: number;
  page_size: number;
  total_owned_products: number;
  title_query: string;
  match_filter: "all" | "matched" | "unmatched";
  owned_products: MatchableProduct[];
  competitor_products: MatchableProduct[];
  title_suggested_matches: ProductMatchSuggestion[];
  suggested_matches: ProductMatchSuggestion[];
  reviewed_matches: ProductMatchRecord[];
  confidence_threshold: number;
  embedding_provider: "openrouter" | "openai" | "local-test";
  embedding_model: string;
  embedding_status: MatchingEmbeddingStatus | null;
};

export type MatchingEmbeddingStatus = {
  provider: "openrouter" | "openai" | "local-test";
  model: string;
  owned_store_domain: string;
  owned_total_products: number;
  owned_cached_embeddings: number;
  owned_missing_embeddings: number;
  competitor_store_domain: string;
  competitor_total_products: number;
  competitor_cached_embeddings: number;
  competitor_missing_embeddings: number;
};

export type EmbeddingSyncResult = {
  store_domain: string;
  processed_products: number;
  generated_embeddings: number;
  skipped_existing_embeddings: number;
  provider: "openrouter" | "openai" | "local-test";
  model: string;
};

export type RecommendationPagePayload = {
  suggestions: RecommendationGroupPayload[];
  page: number;
  page_size: number;
  total_groups: number;
  total_pages: number;
};

export type GenerateRecommendationsResult = RecommendationPagePayload & {
  owned_sync: EmbeddingSyncResult | null;
  competitor_sync: EmbeddingSyncResult;
  embedding_provider: "openrouter" | "openai" | "local-test";
  embedding_model: string;
  stage_timings: {
    resolve_config_ms: number;
    sync_embeddings_ms: number;
    load_inputs_ms: number;
    build_suggestions_ms: number;
    total_ms: number;
  };
};

export type ProductMatchSuggestion = {
  owned_product: MatchableProduct;
  competitor_product: MatchableProduct;
  score: number;
  method: string;
};

export type RecommendationProductPreview = Pick<
  MatchableProduct,
  | "source_product_id"
  | "store_domain"
  | "title"
  | "product_url"
  | "image_url"
  | "vendor"
  | "product_type"
  | "latest_price"
>;

export type RecommendationCandidatePayload = {
  competitor_product: RecommendationProductPreview;
  score: number;
  method: string;
};

export type RecommendationGroupPayload = {
  owned_product: RecommendationProductPreview;
  candidates: RecommendationCandidatePayload[];
};

export type ProductMatchRecord = {
  owned_product: MatchableProduct;
  competitor_product: MatchableProduct;
  score: number;
  method: string;
  status: "approved" | "rejected" | "pending";
  updated_at: string;
};
