/**
 * @jest-environment node
 */
import { SqliteDB } from "@/persistence/database";
import { deleteScrapeRun } from "@/services/scrape-runs/delete-scrape";
import { getScrapeRun } from "@/services/scrape-runs/get-scrape";
import { listScrapeSites } from "@/services/scrape-runs/list-sites";
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";
import { createIntegrationUser, resetIntegrationDatabase } from "./db-test-helpers";

function getLatestUserRunId(userId: number): Promise<number | null> {
  return new Promise((resolve, reject) => {
    SqliteDB.get<{ scrape_run_id: number }>(
      `SELECT scrape_run_id
       FROM user_scrape_runs
       WHERE user_id = ?
       ORDER BY scrape_run_id DESC
       LIMIT 1`,
      [userId],
      (error, row) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(row?.scrape_run_id ?? null);
      }
    );
  });
}

function buildProduct(price: string) {
  return [
    {
      id: "prod-1",
      title: "Integration Product",
      product_url: "https://sample-shop.com/products/integration-product",
      vendor: "Sample Vendor",
      product_type: "Test",
      platform: "shopify",
      variants: [
        {
          id: "var-1",
          title: "Default",
          price,
          available: true,
          product_url: "https://sample-shop.com/products/integration-product",
        },
      ],
    },
  ];
}

describe("sqlite integration - scrape persistence", () => {
  beforeEach(async () => {
    await resetIntegrationDatabase();
  });

  test("save -> list latest -> get previous -> delete run", async () => {
    const userId = await createIntegrationUser(`scrape_${Date.now()}`);

    await saveScrapeRun({
      userId,
      rawUrl: "sample-shop.com",
      products: buildProduct("10.00"),
    });

    await saveScrapeRun({
      userId,
      rawUrl: "sample-shop.com",
      products: buildProduct("12.00"),
    });

    const sites = await listScrapeSites({ userId, page: 1, pageSize: 10 });
    expect(sites.sites).toHaveLength(1);

    const latestRunId = sites.sites[0].latestRun?.id;
    expect(typeof latestRunId).toBe("number");

    const latest = await getScrapeRun({ userId, scrapeId: latestRunId as number });
    expect(latest).not.toBeNull();
    expect(latest?.products).toHaveLength(1);
    expect(latest?.previousProducts).not.toBeNull();

    await deleteScrapeRun({ userId, scrapeId: latestRunId as number });

    const sitesAfterDelete = await listScrapeSites({ userId, page: 1, pageSize: 10 });
    expect(sitesAfterDelete.sites).toHaveLength(1);
    expect(sitesAfterDelete.sites[0].runs.length).toBe(1);
  });

  test("product-scoped scrapes do not replace the latest store snapshot", async () => {
    const userId = await createIntegrationUser(`product_scope_${Date.now()}`);
    const storeUrl = "sample-shop.com";

    await saveScrapeRun({
      userId,
      rawUrl: storeUrl,
      products: buildProduct("10.00"),
      resourceType: "store",
    });

    await saveScrapeRun({
      userId,
      rawUrl: `${storeUrl}/products/integration-product`,
      products: buildProduct("12.00"),
      resourceType: "product",
    });

    const sites = await listScrapeSites({ userId, page: 1, pageSize: 10 });
    expect(sites.sites).toHaveLength(1);
    expect(sites.sites[0].runs).toHaveLength(1);
    expect(sites.sites[0].latestRun?.products).toHaveLength(1);

    const productRunId = await getLatestUserRunId(userId);
    expect(productRunId).not.toBeNull();

    const productRun = await getScrapeRun({ userId, scrapeId: productRunId as number });
    expect(productRun).not.toBeNull();
    expect(productRun?.products).toHaveLength(1);
  });
});
