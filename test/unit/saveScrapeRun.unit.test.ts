/**
 * @jest-environment node
 */
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";

const mockRunInTransaction = jest.fn();
const mockFindOrCreateStore = jest.fn();
const mockCreateScrapeRun = jest.fn();
const mockLinkUserToScrapeRun = jest.fn();
const mockUpsertSourceProduct = jest.fn();
const mockUpsertSourceVariant = jest.fn();
const mockInsertObservation = jest.fn();
const mockFindLatestStoreScrape = jest.fn();

jest.mock("@/persistence/scrapes-repository", () => ({
  runInTransaction: (...args: unknown[]) => mockRunInTransaction(...args),
  findOrCreateStore: (...args: unknown[]) => mockFindOrCreateStore(...args),
  createScrapeRun: (...args: unknown[]) => mockCreateScrapeRun(...args),
  linkUserToScrapeRun: (...args: unknown[]) => mockLinkUserToScrapeRun(...args),
  upsertSourceProduct: (...args: unknown[]) => mockUpsertSourceProduct(...args),
  upsertSourceVariant: (...args: unknown[]) => mockUpsertSourceVariant(...args),
  insertObservation: (...args: unknown[]) => mockInsertObservation(...args),
  findLatestStoreScrape: (...args: unknown[]) => mockFindLatestStoreScrape(...args),
}));

describe("saveScrapeRun", () => {
  beforeEach(() => {
    mockRunInTransaction.mockReset();
    mockFindOrCreateStore.mockReset();
    mockCreateScrapeRun.mockReset();
    mockLinkUserToScrapeRun.mockReset();
    mockUpsertSourceProduct.mockReset();
    mockUpsertSourceVariant.mockReset();
    mockInsertObservation.mockReset();
    mockFindLatestStoreScrape.mockReset();

    mockRunInTransaction.mockImplementation(async (callback: () => Promise<void>) => {
      await callback();
    });

    mockFindOrCreateStore.mockResolvedValue(5);
    mockCreateScrapeRun.mockResolvedValue(10);
  });

  test("rejects when user id is missing", async () => {
    await expect(
      saveScrapeRun({
        rawUrl: "example.com",
        products: [],
      })
    ).rejects.toThrow("Missing user id");
  });

  test("creates run/link and skips product inserts for empty payload", async () => {
    const result = await saveScrapeRun({
      userId: 7,
      rawUrl: "example.com",
      products: [],
    });

    expect(result).toEqual({ scrapeRunId: 10, storeId: 5 });
    expect(mockFindOrCreateStore).toHaveBeenCalled();
    expect(mockCreateScrapeRun).toHaveBeenCalledWith(5);
    expect(mockLinkUserToScrapeRun).toHaveBeenCalledWith(7, 10, 5);
    expect(mockUpsertSourceProduct).not.toHaveBeenCalled();
    expect(mockUpsertSourceVariant).not.toHaveBeenCalled();
    expect(mockInsertObservation).not.toHaveBeenCalled();
  });
});
