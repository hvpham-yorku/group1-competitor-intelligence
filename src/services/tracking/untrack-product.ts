import {
  deleteTrackedProduct,
  findSourceProductIdByUrl,
} from "@/persistence/tracked-products-repository";
import { normalizeTrackedProductInput } from "./utils";

export async function untrackProduct(input: {
  userId: number;
  product_url?: unknown;
}): Promise<void> {
  const normalized = normalizeTrackedProductInput(input);
  const sourceProductId = await findSourceProductIdByUrl(normalized.url);

  if (!sourceProductId) {
    return;
  }

  await deleteTrackedProduct({
    userId: input.userId,
    sourceProductId,
  });
}
