import {
  getTrackedProductDetail,
  getTrackedProductSummaries,
  type TrackedProductDetail,
  type TrackedProductSummary,
} from "@/persistence/tracked-products-repository";

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
