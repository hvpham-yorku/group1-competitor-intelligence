/**
 * @jest-environment node
 */
import { trackProduct } from "@/services/tracking/track-product";
import { untrackProduct } from "@/services/tracking/untrack-product";

const mockInsertTrackedProduct = jest.fn();
const mockDeleteTrackedProduct = jest.fn();
const mockFindSourceProductIdByUrl = jest.fn();

jest.mock("@/persistence/tracked-products-repository", () => ({
  findSourceProductIdByUrl: (...args: unknown[]) =>
    mockFindSourceProductIdByUrl(...args),
  insertTrackedProduct: (...args: unknown[]) => mockInsertTrackedProduct(...args),
  deleteTrackedProduct: (...args: unknown[]) => mockDeleteTrackedProduct(...args),
}));

describe("tracking services", () => {
  beforeEach(() => {
    mockInsertTrackedProduct.mockReset();
    mockDeleteTrackedProduct.mockReset();
    mockFindSourceProductIdByUrl.mockReset();
  });

  test("trackProduct resolves a source product id before persisting", async () => {
    mockFindSourceProductIdByUrl.mockResolvedValue(42);

    await trackProduct({
      userId: 7,
      product_url: " https://example.com/products/barrier-cream ",
    });

    expect(mockFindSourceProductIdByUrl).toHaveBeenCalledWith(
      "https://example.com/products/barrier-cream"
    );
    expect(mockInsertTrackedProduct).toHaveBeenCalledWith({
      userId: 7,
      sourceProductId: 42,
    });
  });

  test("untrackProduct deletes by user and source product id", async () => {
    mockFindSourceProductIdByUrl.mockResolvedValue(42);

    await untrackProduct({
      userId: 7,
      product_url: "https://example.com/products/barrier-cream",
    });

    expect(mockFindSourceProductIdByUrl).toHaveBeenCalledWith(
      "https://example.com/products/barrier-cream"
    );
    expect(mockDeleteTrackedProduct).toHaveBeenCalledWith({
      userId: 7,
      sourceProductId: 42,
    });
  });

  test("trackProduct rejects missing tracked fields", async () => {
    await expect(
      trackProduct({
        userId: 7,
        product_url: "",
      })
    ).rejects.toThrow("Missing tracked product fields");
  });

  test("trackProduct rejects unknown source product urls", async () => {
    mockFindSourceProductIdByUrl.mockResolvedValue(null);

    await expect(
      trackProduct({
        userId: 7,
        product_url: "https://example.com/products/missing",
      })
    ).rejects.toThrow("Tracked product was not found in source_products");
  });
});
