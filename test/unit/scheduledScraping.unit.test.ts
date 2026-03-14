/**
 * @jest-environment node
 */
import { runScheduledTrackingSweep } from "@/services/scheduled_scraping/scheduled_scraping";

const mockGetTrackedProductsForScheduling = jest.fn();
const mockInsertTrackingRun = jest.fn();
const mockSaveScrapeRun = jest.fn();
const mockExecute = jest.fn();

jest.mock("@/persistence/tracked-products-repository", () => ({
  getTrackedProductsForScheduling: (...args: unknown[]) =>
    mockGetTrackedProductsForScheduling(...args),
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
});
