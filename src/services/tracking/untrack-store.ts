import {
  deleteTrackedStore,
  findStoreIdByUrl,
} from "@/persistence/tracked-stores-repository";
import { normalizeTrackedStoreInput } from "@/services/tracking/utils";

export async function untrackStore(input: {
  userId: number;
  store_url?: unknown;
}): Promise<void> {
  const normalized = normalizeTrackedStoreInput(input);
  const storeId = await findStoreIdByUrl(normalized.url);

  if (!storeId) {
    return;
  }

  await deleteTrackedStore({
    userId: input.userId,
    storeId,
  });
}
