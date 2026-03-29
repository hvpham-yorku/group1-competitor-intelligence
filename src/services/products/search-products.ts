import {
  listSampleProductsForUser,
  searchProductsForUser,
} from "@/persistence/product-search-repository";
import type { ProductSearchPage } from "@/services/products/search-types";

export async function searchProducts(input: {
  userId: number;
  query?: string;
  storeDomain?: string;
  limit?: number;
  page?: number;
}): Promise<ProductSearchPage> {
  const query = input.query?.trim() ?? "";
  const limit = Math.max(1, Math.min(input.limit ?? 24, 100));
  const page = Math.max(1, input.page ?? 1);
  const offset = (page - 1) * limit;

  if (!query) {
    return listSampleProductsForUser({
      userId: input.userId,
      storeDomain: input.storeDomain,
      limit,
      offset,
    });
  }

  return searchProductsForUser({
    userId: input.userId,
    query,
    storeDomain: input.storeDomain,
    limit,
    offset,
  });
}
