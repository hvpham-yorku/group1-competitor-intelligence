/**
 * @jest-environment node
 */
import { getTrackedProduct, listTrackedProducts } from "@/services/tracking/get-tracked-products";

const mockGetTrackedProductSummaries = jest.fn();
const mockGetTrackedProductDetail = jest.fn();

jest.mock("@/persistence/tracked-products-repository", () => ({
  getTrackedProductSummaries: (...args: unknown[]) =>
    mockGetTrackedProductSummaries(...args),
  getTrackedProductDetail: (...args: unknown[]) => mockGetTrackedProductDetail(...args),
}));

describe("tracked product query services", () => {
  beforeEach(() => {
    mockGetTrackedProductSummaries.mockReset();
    mockGetTrackedProductDetail.mockReset();
  });

  test("listTrackedProducts returns repository summaries", async () => {
    mockGetTrackedProductSummaries.mockResolvedValue([
      { source_product_id: 5, title: "Product A" },
    ]);

    await expect(listTrackedProducts({ userId: 9 })).resolves.toEqual([
      { source_product_id: 5, title: "Product A" },
    ]);
    expect(mockGetTrackedProductSummaries).toHaveBeenCalledWith({ userId: 9 });
  });

  test("getTrackedProduct returns repository detail", async () => {
    mockGetTrackedProductDetail.mockResolvedValue({
      summary: { source_product_id: 5, title: "Product A" },
      history: [],
      recent_events: [],
    });

    await expect(getTrackedProduct({ userId: 9, sourceProductId: 5 })).resolves.toEqual({
      summary: { source_product_id: 5, title: "Product A" },
      history: [],
      recent_events: [],
    });

    expect(mockGetTrackedProductDetail).toHaveBeenCalledWith({
      userId: 9,
      sourceProductId: 5,
    });
  });
});
