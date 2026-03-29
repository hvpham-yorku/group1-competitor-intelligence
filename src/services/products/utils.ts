import type {
  ObservationHistoryPoint,
  ObservationRecentEvent,
} from "@/services/products/observation-utils";
import { parseImageUrl } from "@/services/products/observation-utils";

export type ProductHistoryPoint = ObservationHistoryPoint;

export type MatchedProductSummary = {
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
  score: number;
  method: string;
  status: "approved" | "rejected" | "pending";
  updated_at: string;
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
  recent_events: ObservationRecentEvent[];
  matched_products: MatchedProductSummary[];
  comparison_history: Array<{
    product: MatchedProductSummary;
    history: ProductHistoryPoint[];
  }>;
};

export { parseImageUrl };
