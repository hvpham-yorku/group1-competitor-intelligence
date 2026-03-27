/**
 * @jest-environment node
 */
import { runScheduledTrackingSweep } from "@/services/scheduled_scraping/scheduled_scraping";

const mockGetTrackedProductsForScheduling = jest.fn();
const mockGetTrackedStoresForScheduling = jest.fn();
const mockInsertTrackingRun = jest.fn();
const mockSaveScrapeRun = jest.fn();
const mockExecute = jest.fn();

jest.mock("@/persistence/tracked-products-repository", () => ({
  getTrackedProductsForScheduling: (...args: unknown[]) =>
    mockGetTrackedProductsForScheduling(...args),
}));

jest.mock("@/persistence/tracked-stores-repository", () => ({
  getTrackedStoresForScheduling: (...args: unknown[]) =>
    mockGetTrackedStoresForScheduling(...args),
}));

jest.mock("@/persistence/tracking-runs-repository", () => ({
  insertTrackingRun: (...args: unknown[]) => mockInsertTrackingRun(...args),
}));

jest.mock("@/services/scrape-runs/save-scrape", () => ({
  saveScrapeRun: (...args: unknown[]) => mockSaveScrapeRun(...args),
}));

jest.mock("@/services/scraper/engine", () => ({
  ScraperEngine: {
    getInstance: () => ({
      execute: (...args: unknown[]) => mockExecute(...args),
    }),
  },
}));

describe("scheduled scraping", () => {
  beforeEach(() => {
    mockGetTrackedProductsForScheduling.mockReset();
    mockGetTrackedStoresForScheduling.mockReset();
    mockInsertTrackingRun.mockReset();
    mockSaveScrapeRun.mockReset();
    mockExecute.mockReset();
    globalThis.__trackingSchedulerRunning = false;
    globalThis.__trackingSchedulerInitialized = false;
  });

  test("skips sweep when another run is in progress", async () => {
    globalThis.__trackingSchedulerRunning = true;

    await runScheduledTrackingSweep();

    expect(mockGetTrackedProductsForScheduling).not.toHaveBeenCalled();
  });

  test("continues processing after per-target failures", async () => {
    mockGetTrackedProductsForScheduling.mockResolvedValue([
      {
        source_product_id: 1,
        product_url: "https://example.com/products/a",
        user_ids: [7],
      },
      {
        source_product_id: 2,
        product_url: "https://example.com/products/b",
        user_ids: [7, 8],
      },
    ]);
    mockGetTrackedStoresForScheduling.mockResolvedValue([]);

    mockExecute
      .mockRejectedValueOnce(new Error("blocked"))
      .mockResolvedValueOnce({ products: [{ title: "B" }] });

    mockSaveScrapeRun.mockResolvedValue({ scrapeRunId: 22, storeId: 3 });

    await runScheduledTrackingSweep();

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockSaveScrapeRun).toHaveBeenCalledTimes(1);
    expect(mockSaveScrapeRun).toHaveBeenCalledWith({
      userIds: [7, 8],
      rawUrl: "https://example.com/products/b",
      products: [{ title: "B" }],
      resourceType: "product",
    });

    expect(mockInsertTrackingRun).toHaveBeenCalledWith(
      expect.objectContaining({
        scrapeRunId: 22,
        triggerType: "scheduled",
        status: "completed",
      })
    );
    expect(globalThis.__trackingSchedulerRunning).toBe(false);
  });

  test("saves scheduled tracked stores as store resource type", async () => {
    mockGetTrackedProductsForScheduling.mockResolvedValue([]);
    mockGetTrackedStoresForScheduling.mockResolvedValue([
      {
        store_id: 4,
        store_domain: "tone.shop",
        user_ids: [3, 5],
      },
    ]);

    mockExecute.mockResolvedValueOnce({ products: [{ title: "Store Product" }] });
    mockSaveScrapeRun.mockResolvedValue({ scrapeRunId: 31, storeId: 4 });

    await runScheduledTrackingSweep();

    expect(mockSaveScrapeRun).toHaveBeenCalledWith({
      userIds: [3, 5],
      rawUrl: "tone.shop",
      products: [{ title: "Store Product" }],
      resourceType: "store",
    });
    expect(mockInsertTrackingRun).toHaveBeenCalledWith(
      expect.objectContaining({
        scrapeRunId: 31,
        triggerType: "scheduled",
        status: "completed",
      })
    );
  });
});
