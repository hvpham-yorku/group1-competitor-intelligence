/**
 * @jest-environment node
 */
import {
  findTrackingRunById,
  insertTrackingRun,
  updateTrackingRun,
} from "@/persistence/tracking-runs-repository";

jest.mock("@/persistence/database", () => {
  const sqlite3Lib = jest.requireActual("sqlite3") as typeof import("sqlite3");
  const db = new sqlite3Lib.Database(":memory:");

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS scrape_runs(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL
      )
    `);

    db.run(`INSERT INTO scrape_runs (id) VALUES (1)`);

    db.run(`
      CREATE TABLE IF NOT EXISTS tracking_runs(
        scrape_run_id INTEGER PRIMARY KEY NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'manual',
        status TEXT NOT NULL DEFAULT 'completed',
        error_message TEXT,
        started_at TEXT NOT NULL,
        finished_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  });

  return { SqliteDB: db };
});

describe("tracking runs repository", () => {
  test("creates and updates a tracking run", async () => {
    const trackingRunId = await insertTrackingRun({
      scrapeRunId: 1,
      triggerType: "cron",
      status: "running",
      startedAt: "2026-03-13T12:00:00.000Z",
    });

    await updateTrackingRun({
      scrapeRunId: trackingRunId,
      status: "completed",
      finishedAt: "2026-03-13T12:05:00.000Z",
    });

    const row = await findTrackingRunById(trackingRunId);

    expect(row).toMatchObject({
      scrape_run_id: trackingRunId,
      trigger_type: "cron",
      status: "completed",
      started_at: "2026-03-13T12:00:00.000Z",
      finished_at: "2026-03-13T12:05:00.000Z",
    });
  });
});
