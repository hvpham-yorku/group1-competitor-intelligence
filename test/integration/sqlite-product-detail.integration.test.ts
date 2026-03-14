/**
 * @jest-environment node
 */
import { findSourceProductIdByUrl } from "@/persistence/tracked-products-repository";
import { getProductDetail } from "@/services/products/get-product-details";
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";
import { createIntegrationUser, resetIntegrationDatabase } from "./db-test-helpers";

describe("sqlite integration - product detail read model", () => {
  beforeEach(async () => {
    await resetIntegrationDatabase();
  });

  test("builds history and recent events from observations", async () => {
    const userId = await createIntegrationUser(`detail_${Date.now()}`);
    const productUrl = "https://sample-product-detail.com/products/p1";

    const makeProduct = (price: string) => [
      {
        id: "prod-1",
        title: "Detail Product",
        product_url: productUrl,
        vendor: "Sample Vendor",
        product_type: "Test",
        platform: "shopify",
        variants: [
          {
            id: "var-1",
            title: "Default",
            price,
            available: true,
            product_url: productUrl,
          },
        ],
      },
    ];

    await saveScrapeRun({
      userId,
      rawUrl: "sample-product-detail.com",
      products: makeProduct("30.00"),
    });

    await saveScrapeRun({
      userId,
      rawUrl: "sample-product-detail.com",
      products: makeProduct("25.00"),
    });

    const sourceProductId = await findSourceProductIdByUrl(productUrl);
    expect(sourceProductId).toBeTruthy();

    const detail = await getProductDetail({
      sourceProductId: sourceProductId as number,
    });

    expect(detail).not.toBeNull();
    expect(detail?.summary.latest_price).not.toBeNull();
    expect(detail?.summary.previous_price).not.toBeNull();
    expect(detail?.history.length).toBeGreaterThanOrEqual(2);
    expect(detail?.recent_events.length).toBeGreaterThanOrEqual(1);
  });
});
