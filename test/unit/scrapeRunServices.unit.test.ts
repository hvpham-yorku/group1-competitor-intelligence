/**
 * @jest-environment node
 */
import { deleteScrapeRun } from "@/services/scrape-runs/delete-scrape";
import { getScrapeRun } from "@/services/scrape-runs/get-scrape";
import { listScrapeSites } from "@/services/scrape-runs/list-sites";

const mockFindScrapeRunById = jest.fn();
const mockFindPreviousScrapeRun = jest.fn();
const mockListScrapeSites = jest.fn();
const mockDeleteScrapeRun = jest.fn();

jest.mock("@/persistence/scrapes-repository", () => ({
  findScrapeRunById: (...args: unknown[]) => mockFindScrapeRunById(...args),
  findPreviousScrapeRun: (...args: unknown[]) => mockFindPreviousScrapeRun(...args),
  listScrapeSites: (...args: unknown[]) => mockListScrapeSites(...args),
  deleteScrapeRun: (...args: unknown[]) => mockDeleteScrapeRun(...args),
}));

describe("scrape-run services", () => {
  beforeEach(() => {
    mockFindScrapeRunById.mockReset();
    mockFindPreviousScrapeRun.mockReset();
    mockListScrapeSites.mockReset();
    mockDeleteScrapeRun.mockReset();
  });

  test("getScrapeRun returns null when run is not found", async () => {
    mockFindScrapeRunById.mockResolvedValue(null);

    const result = await getScrapeRun({ userId: 1, scrapeId: 999 });

    expect(result).toBeNull();
    expect(mockFindPreviousScrapeRun).not.toHaveBeenCalled();
  });

  test("getScrapeRun returns current and previous products", async () => {
    mockFindScrapeRunById.mockResolvedValue({
      id: 2,
      url: "example.com",
      created_at: "2026-03-13T00:00:00.000Z",
      products: [{ title: "Current" }],
    });
    mockFindPreviousScrapeRun.mockResolvedValue({
      id: 1,
      url: "example.com",
      created_at: "2026-03-12T00:00:00.000Z",
      products: [{ title: "Previous" }],
    });

    const result = await getScrapeRun({ userId: 1, scrapeId: 2 });

    expect(result).toEqual({
      id: 2,
      url: "example.com",
      created_at: "2026-03-13T00:00:00.000Z",
      products: [{ title: "Current" }],
      previousProducts: [{ title: "Previous" }],
    });
  });

  test("listScrapeSites maps repository output", async () => {
    mockListScrapeSites.mockResolvedValue({
      page: 1,
      pageSize: 5,
      total: 1,
      totalPages: 1,
      sites: [
        {
          url: "example.com",
          runs: [{ id: 2, created_at: "2026-03-13T00:00:00.000Z" }],
          latestRun: {
            id: 2,
            created_at: "2026-03-13T00:00:00.000Z",
            products: [{ title: "A" }],
          },
        },
      ],
    });

    const result = await listScrapeSites({
      userId: 1,
      page: 1,
      pageSize: 5,
      query: "example",
    });

    expect(result.total).toBe(1);
    expect(result.sites[0].url).toBe("example.com");
    expect(result.sites[0].latestRun?.products).toEqual([{ title: "A" }]);
  });

  test("deleteScrapeRun forwards to repository", async () => {
    await deleteScrapeRun({ userId: 7, scrapeId: 77 });

    expect(mockDeleteScrapeRun).toHaveBeenCalledWith(7, 77);
  });
});
