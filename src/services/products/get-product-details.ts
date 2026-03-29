import { getProductDetail as getProductDetailRecord } from "@/persistence/product-details-repository";
import type { ProductDetail } from "@/services/products/utils";

export async function getProductDetail(input: {
  userId: number;
  sourceProductId: number;
}): Promise<ProductDetail | null> {
  return getProductDetailRecord(input);
}
