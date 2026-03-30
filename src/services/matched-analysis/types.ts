export type MatchedAnalysisDeltaDirection = "all" | "positive" | "negative";
export type MatchedAnalysisSortKey = "absolute_gap" | "gap_delta" | "owned_title" | "competitor_title";
export type MatchedAnalysisSortOrder = "asc" | "desc";

export type MatchedAnalysisRow = {
  owned_source_product_id: number;
  owned_title: string;
  owned_product_url: string;
  owned_image_url: string | null;
  owned_vendor: string | null;
  owned_product_type: string | null;
  owned_store_domain: string;
  owned_latest_price: number | null;
  competitor_source_product_id: number;
  competitor_title: string;
  competitor_product_url: string;
  competitor_image_url: string | null;
  competitor_vendor: string | null;
  competitor_product_type: string | null;
  competitor_store_domain: string;
  competitor_latest_price: number | null;
  gap_delta: number | null;
  absolute_gap: number | null;
  score: number;
  method: string;
  updated_at: string;
};

export type MatchedAnalysisKpis = {
  approved_matches: number;
  competitors: number;
  positive_gaps: number;
  negative_gaps: number;
  neutral_gaps: number;
};

export type MatchedAnalysisResponse = {
  rows: MatchedAnalysisRow[];
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
  query: string;
  store: string;
  competitor: string;
  delta_direction: MatchedAnalysisDeltaDirection;
  sort_key: MatchedAnalysisSortKey;
  sort_order: MatchedAnalysisSortOrder;
  stores: string[];
  competitors: string[];
  kpis: MatchedAnalysisKpis;
};
