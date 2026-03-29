import { deleteTrackedProductsByStoreDomain } from "@/persistence/tracked-products-repository";
import {
  deleteTrackedStore,
  findStoreIdByUrl,
} from "@/persistence/tracked-stores-repository";
import { deleteSiteHistory } from "@/services/scrape-runs/delete-site-history";
import { normalizeStoreDomain } from "@/services/scrape-runs/utils";

export async function deleteCompetitor(input: {
  userId: number;
  rawUrl: string;
}): Promise<void> {
  const domain = normalizeStoreDomain(input.rawUrl);
  if (!domain) {
    throw new Error("Missing url");
  }

  await deleteSiteHistory({
    userId: input.userId,
    rawUrl: domain,
  });

  await deleteTrackedProductsByStoreDomain({
    userId: input.userId,
    storeDomain: domain,
  });

  const storeId = await findStoreIdByUrl(domain);
  if (storeId) {
    await deleteTrackedStore({
      userId: input.userId,
      storeId,
    });
  }
}
