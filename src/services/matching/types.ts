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
  owned_products: MatchableProduct[];
  competitor_products: MatchableProduct[];
  suggested_matches: ProductMatchSuggestion[];
  reviewed_matches: ProductMatchRecord[];
  confidence_threshold: number;
  embedding_provider: "openai" | "local-test";
  embedding_model: string;
};

export type EmbeddingSyncResult = {
  store_domain: string;
  processed_products: number;
  generated_embeddings: number;
  skipped_existing_embeddings: number;
  provider: "openai" | "local-test";
  model: string;
};

export type ProductMatchSuggestion = {
  owned_product: MatchableProduct;
  competitor_product: MatchableProduct;
  score: number;
  method: string;
};

export type ProductMatchRecord = {
  owned_product: MatchableProduct;
  competitor_product: MatchableProduct;
  score: number;
  method: string;
  status: "approved" | "rejected" | "pending";
  updated_at: string;
};
