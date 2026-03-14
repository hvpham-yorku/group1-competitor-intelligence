import cron from "node-cron";
import { getTrackedProductsForScheduling } from "@/persistence/tracked-products-repository";
import { insertTrackingRun } from "@/persistence/tracking-runs-repository";
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";
import { ScraperEngine } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";

declare global {
  var __trackingSchedulerInitialized: boolean | undefined;
  var __trackingSchedulerRunning: boolean | undefined;
}

async function scrapeTrackedProduct(target: Awaited<ReturnType<typeof getTrackedProductsForScheduling>>[number]) {
  const startedAt = new Date();
  const engine = ScraperEngine.getInstance();
  const request = new ScraperRequest(target.product_url);
  request.resourceType = "product";

  console.log("[scheduled_tracking] scraping tracked product", {
    source_product_id: target.source_product_id,
    product_url: target.product_url,
    tracked_users: target.user_ids.length,
  });

  const result = await engine.execute(request);
  const savedRun = await saveScrapeRun({
    userIds: target.user_ids,
    rawUrl: target.product_url,
    products: Array.isArray(result?.products) ? result.products : [],
    resourceType: "product",
  });

  await insertTrackingRun({
    scrapeRunId: savedRun.scrapeRunId,
    triggerType: "scheduled",
    status: "completed",
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  });
}

export async function runScheduledTrackingSweep() {
  if (globalThis.__trackingSchedulerRunning) {
    return;
  }

  globalThis.__trackingSchedulerRunning = true;
  const startedAt = new Date();

  try {
    const targets = await getTrackedProductsForScheduling();

    for (const target of targets) {
      if (!target.product_url || target.user_ids.length === 0) {
        continue;
      }

      try {
        await scrapeTrackedProduct(target);
      } catch (error) {
        console.error("[scheduled_tracking] scheduled scrape failed", {
          source_product_id: target.source_product_id,
          product_url: target.product_url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    globalThis.__trackingSchedulerRunning = false;
    console.log("[scheduled_tracking] sweep complete", {
      duration_ms: Date.now() - startedAt.getTime(),
    });
  }
}

export function initializeScheduledScraping() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (globalThis.__trackingSchedulerInitialized) {
    return;
  }

  cron.schedule(
    "0 1 * * *",
    () => {
      void runScheduledTrackingSweep();
    },
    { timezone: "UTC" }
  );

  globalThis.__trackingSchedulerInitialized = true;
  console.log("[scheduled_tracking] initialized", {
    schedule: "0 1 * * *",
    timezone: "UTC",
  });
}
