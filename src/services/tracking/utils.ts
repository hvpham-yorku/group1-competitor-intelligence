import type {
  ObservationHistoryPoint,
  ObservationRecentEvent,
} from "@/services/products/observation-utils";
import { parseImageUrl } from "@/services/products/observation-utils";

function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export type TrackedProductSummary = {
  tracked_id: number;
  source_product_id: number;
  title: string;
  product_url: string;
  vendor: string | null;
  product_type: string | null;
  store_domain: string;
  store_platform: string | null;
  image_url: string | null;
  tracked_at: string;
  schedule_label: string;
  latest_price: number | null;
  previous_price: number | null;
  price_delta: number | null;
  latest_seen_at: string | null;
  latest_scrape_run_id: number | null;
};

export type TrackedStoreSummary = {
  tracked_id: number;
  store_id: number;
  store_domain: string;
  store_platform: string | null;
  tracked_at: string;
  schedule_label: string;
  latest_scrape_run_id: number | null;
  latest_scraped_at: string | null;
  is_owned_store: boolean;
};

export type TrackedProductHistoryPoint = ObservationHistoryPoint;

export type TrackedProductDetail = {
  summary: TrackedProductSummary;
  history: TrackedProductHistoryPoint[];
  recent_events: ObservationRecentEvent[];
};

export const TRACKING_SCHEDULE_LABEL = "Daily at 01:00 UTC";

export function normalizeTrackedProductInput(input: {
  product_url?: unknown;
}): {
  url: string;
} {
  const url = cleanString(input.product_url);

  if (!url) {
    throw new Error("Missing tracked product fields");
  }

  return {
    url,
  };
}

export function normalizeTrackedStoreInput(input: {
  store_url?: unknown;
}): {
  url: string;
} {
  const url = cleanString(input.store_url);

  if (!url) {
    throw new Error("Missing tracked store fields");
  }

  return {
    url,
  };
}

export { parseImageUrl };
