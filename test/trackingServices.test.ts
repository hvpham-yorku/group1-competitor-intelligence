/**
 * @jest-environment node
 */
import { trackProduct } from "@/services/tracking/track-product";
import { untrackProduct } from "@/services/tracking/untrack-product";

const mockInsertTrackedProduct = jest.fn();
const mockDeleteTrackedProduct = jest.fn();

jest.mock("@/persistence/tracked-products-repository", () => ({
  insertTrackedProduct: (...args: unknown[]) => mockInsertTrackedProduct(...args),
  deleteTrackedProduct: (...args: unknown[]) => mockDeleteTrackedProduct(...args),
}));

describe("tracking services", () => {
  beforeEach(() => {
    mockInsertTrackedProduct.mockReset();
    mockDeleteTrackedProduct.mockReset();
  });

  test("trackProduct normalizes payload before persisting", async () => {
    await trackProduct({
      userId: 7,
      title: " Barrier Cream ",
      platform: " shopify ",
      product_url: " https://example.com/products/barrier-cream ",
    });

    expect(mockInsertTrackedProduct).toHaveBeenCalledWith({
      userId: 7,
      title: "Barrier Cream",
      shop: "shopify",
      url: "https://example.com/products/barrier-cream",
    });
  });

  test("untrackProduct deletes by user and url", async () => {
    await untrackProduct({
      userId: 7,
      title: "Barrier Cream",
      platform: "shopify",
      product_url: "https://example.com/products/barrier-cream",
    });

    expect(mockDeleteTrackedProduct).toHaveBeenCalledWith({
      userId: 7,
      url: "https://example.com/products/barrier-cream",
    });
  });

  test("trackProduct rejects missing tracked fields", async () => {
    await expect(
      trackProduct({
        userId: 7,
        title: "",
        platform: "shopify",
        product_url: "",
      })
    ).rejects.toThrow("Missing tracked product fields");
  });
});
