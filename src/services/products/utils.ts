import { parseImageUrl } from "@/services/tracking/utils";

export type ProductHistoryPoint = {
  scrape_run_id: number;
  observed_at: string;
  price: number | null;
  compare_at_price: number | null;
  available_variants: number;
  total_variants: number;
};

export type ProductDetailSummary = {
  source_product_id: number;
  title: string;
  product_url: string;
  vendor: string | null;
  product_type: string | null;
  store_domain: string;
  store_platform: string | null;
  image_url: string | null;
  latest_price: number | null;
  previous_price: number | null;
  price_delta: number | null;
  latest_seen_at: string | null;
  latest_scrape_run_id: number | null;
};

export type ProductDetail = {
  summary: ProductDetailSummary;
  history: ProductHistoryPoint[];
  recent_events: Array<
    ProductHistoryPoint & {
      price_delta: number | null;
    }
  >;
};

export { parseImageUrl };
