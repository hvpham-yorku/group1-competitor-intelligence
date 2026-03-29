import {
  listSampleProductsForUser,
  searchProductsForUser,
} from "@/persistence/product-search-repository";
import type { ProductSearchResult } from "@/services/products/search-types";

export async function searchProducts(input: {
  userId: number;
  query?: string;
  storeDomain?: string;
  limit?: number;
}): Promise<ProductSearchResult[]> {
  const query = input.query?.trim() ?? "";

  if (!query) {
    return listSampleProductsForUser({
      userId: input.userId,
      storeDomain: input.storeDomain,
      limit: input.limit,
    });
  }

  return searchProductsForUser({
    userId: input.userId,
    query,
    storeDomain: input.storeDomain,
    limit: input.limit,
  });
}
