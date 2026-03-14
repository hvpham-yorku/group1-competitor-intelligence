/**
 * @jest-environment node
 */
import { findOrCreateStore } from "@/persistence/scrapes-repository";
import { createScrapeRun } from "@/persistence/scrapes-repository";
import {
  findTrackingRunById,
  insertTrackingRun,
  updateTrackingRun,
} from "@/persistence/tracking-runs-repository";
import { resetIntegrationDatabase } from "./db-test-helpers";

describe("sqlite integration - tracking runs repository", () => {
  beforeEach(async () => {
    await resetIntegrationDatabase();
  });

  test("insert/update/find tracking run", async () => {
    const storeId = await findOrCreateStore("sample-tracking-runs.com", "shopify");
    const scrapeRunId = await createScrapeRun(storeId);

    const createdId = await insertTrackingRun({
      scrapeRunId,
      triggerType: "scheduled",
      status: "running",
      startedAt: "2026-03-13T01:00:00.000Z",
    });

    await updateTrackingRun({
      scrapeRunId: createdId,
      status: "completed",
      finishedAt: "2026-03-13T01:05:00.000Z",
    });

    const row = await findTrackingRunById(createdId);
    expect(row).toMatchObject({
      scrape_run_id: createdId,
      trigger_type: "scheduled",
      status: "completed",
      started_at: "2026-03-13T01:00:00.000Z",
      finished_at: "2026-03-13T01:05:00.000Z",
    });
  });
});
