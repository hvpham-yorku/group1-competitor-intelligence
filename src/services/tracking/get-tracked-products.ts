import {
  getRecentDeltaEvents,
  getTrackedProductDetail,
  getTrackedProductSummaries,
} from "@/persistence/tracked-products-repository";
import type {
  RecentDeltaEvent,
  TrackedProductDetail,
  TrackedProductSummary,
} from "@/services/tracking/utils";

export async function listTrackedProducts(input: {
  userId: number;
}): Promise<TrackedProductSummary[]> {
  return getTrackedProductSummaries(input);
}

export async function getTrackedProduct(input: {
  userId: number;
  sourceProductId: number;
}): Promise<TrackedProductDetail | null> {
  return getTrackedProductDetail(input);
}

export async function listRecentDeltaEvents(input: {
  userId: number;
}): Promise<RecentDeltaEvent[]> {
  return getRecentDeltaEvents(input);
}
