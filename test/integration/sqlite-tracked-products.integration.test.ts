/**
 * @jest-environment node
 */
import {
  deleteTrackedProduct,
  findSourceProductIdByUrl,
  getTrackedProductDetail,
  getTrackedProductSummaries,
  insertTrackedProduct,
} from "@/persistence/tracked-products-repository";
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";
import { createIntegrationUser, resetIntegrationDatabase } from "./db-test-helpers";

describe("sqlite integration - tracked product persistence", () => {
  beforeEach(async () => {
    await resetIntegrationDatabase();
  });

  test("track/untrack and read summary/detail", async () => {
    const userId = await createIntegrationUser(`tracking_${Date.now()}`);
    const productUrl = "https://sample-track.com/products/p1";

    const buildProducts = (price: string) => [
      {
        id: "prod-1",
        title: "Tracked Product",
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

    await saveScrapeRun({ userId, rawUrl: "sample-track.com", products: buildProducts("20.00") });
    await saveScrapeRun({ userId, rawUrl: "sample-track.com", products: buildProducts("18.00") });

    const sourceProductId = await findSourceProductIdByUrl(productUrl);
    expect(sourceProductId).toBeTruthy();

    await insertTrackedProduct({ userId, sourceProductId: sourceProductId as number });

    const summaries = await getTrackedProductSummaries({ userId });
    expect(summaries).toHaveLength(1);
    expect(summaries[0].latest_price).not.toBeNull();

    const detail = await getTrackedProductDetail({
      userId,
      sourceProductId: sourceProductId as number,
    });
    expect(detail).not.toBeNull();
    expect((detail?.history || []).length).toBeGreaterThanOrEqual(2);
    expect((detail?.recent_events || []).length).toBeGreaterThanOrEqual(1);

    await deleteTrackedProduct({ userId, sourceProductId: sourceProductId as number });

    const emptySummaries = await getTrackedProductSummaries({ userId });
    expect(emptySummaries).toHaveLength(0);
  });
});
