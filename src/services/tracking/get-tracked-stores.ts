import { getTrackedStoreSummaries } from "@/persistence/tracked-stores-repository";
import type { TrackedStoreSummary } from "@/services/tracking/utils";

export async function listTrackedStores(input: {
  userId: number;
}): Promise<TrackedStoreSummary[]> {
  return getTrackedStoreSummaries(input);
}
