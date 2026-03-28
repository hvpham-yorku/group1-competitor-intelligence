/**
 * @jest-environment node
 */
import { listTrackedStores } from "@/services/tracking/get-tracked-stores";

const mockGetTrackedStoreSummaries = jest.fn();

jest.mock("@/persistence/tracked-stores-repository", () => ({
  getTrackedStoreSummaries: (...args: unknown[]) =>
    mockGetTrackedStoreSummaries(...args),
}));

describe("tracked store query services", () => {
  beforeEach(() => {
    mockGetTrackedStoreSummaries.mockReset();
  });

  test("listTrackedStores returns repository summaries", async () => {
    mockGetTrackedStoreSummaries.mockResolvedValue([
      {
        tracked_id: 1,
        store_id: 9,
        store_domain: "tone.shop",
        store_platform: "shopify",
        tracked_at: "2026-03-01T00:00:00.000Z",
        schedule_label: "Daily at 01:00 UTC",
        latest_scrape_run_id: 11,
        latest_scraped_at: "2026-03-02T00:00:00.000Z",
        is_owned_store: true,
      },
    ]);

    const result = await listTrackedStores({ userId: 7 });

    expect(mockGetTrackedStoreSummaries).toHaveBeenCalledWith({ userId: 7 });
    expect(result[0].store_domain).toBe("tone.shop");
    expect(result[0].is_owned_store).toBe(true);
  });
});
