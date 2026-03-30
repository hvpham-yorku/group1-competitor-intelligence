export type OverviewDateRange = "24h" | "7d" | "30d" | "90d" | "all";
export type OverviewDeltaDirection = "all" | "up" | "down";
export type OverviewSortKey = "latest_seen_at" | "price_delta";
export type OverviewSortOrder = "asc" | "desc";

export type OverviewPriceChangeRow = {
  source_product_id: number;
  title: string;
  product_url: string;
  vendor: string | null;
  product_type: string | null;
  store_domain: string;
  image_url: string | null;
  latest_price: number | null;
  previous_price: number | null;
  price_delta: number | null;
  latest_seen_at: string;
  latest_scrape_run_id: number | null;
};

export type OverviewMatchedPreviewRow = {
  owned_source_product_id: number;
  owned_title: string;
  owned_image_url: string | null;
  owned_store_domain: string;
  owned_latest_price: number | null;
  competitor_source_product_id: number;
  competitor_title: string;
  competitor_image_url: string | null;
  competitor_store_domain: string;
  competitor_latest_price: number | null;
  gap_delta: number | null;
  absolute_gap: number | null;
};

export type OverviewKpis = {
  tracked_products: number;
  tracked_competitors: number;
  price_changes: number;
  increases: number;
  decreases: number;
};

export type OverviewResponse = {
  rows: OverviewPriceChangeRow[];
  page: number;
  page_size: number;
  total_rows: number;
  total_pages: number;
  query: string;
  store: string;
  date_range: OverviewDateRange;
  delta_direction: OverviewDeltaDirection;
  sort_key: OverviewSortKey;
  sort_order: OverviewSortOrder;
  stores: string[];
  kpis: OverviewKpis;
  matched_preview: OverviewMatchedPreviewRow[];
};
