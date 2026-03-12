import { deleteTrackedProduct } from "@/persistence/tracked-products-repository";
import { normalizeTrackedProductInput } from "./utils";

export async function untrackProduct(input: {
  userId: number;
  title?: unknown;
  platform?: unknown;
  product_url?: unknown;
}): Promise<void> {
  const normalized = normalizeTrackedProductInput(input);

  await deleteTrackedProduct({
    userId: input.userId,
    url: normalized.url,
  });
}
