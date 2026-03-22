import { getRow, runSql } from "@/persistence/sqlite-helpers";

export type TrackingRunRow = {
  scrape_run_id: number;
  trigger_type: string;
  status: string;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

export async function insertTrackingRun(input?: {
  scrapeRunId?: number;
  triggerType?: string;
  status?: string;
  errorMessage?: string | null;
  startedAt?: string;
  finishedAt?: string | null;
}): Promise<number> {
  const scrapeRunId = input?.scrapeRunId;
  if (!scrapeRunId) {
    throw new Error("Tracking run requires scrapeRunId");
  }

  const triggerType = input?.triggerType || "manual";
  const status = input?.status || "completed";
  const errorMessage = input?.errorMessage ?? null;
  const startedAt = input?.startedAt || new Date().toISOString();
  const finishedAt = input?.finishedAt ?? null;

  await runSql(
    `INSERT INTO tracking_runs (
      scrape_run_id, trigger_type, status, error_message, started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [scrapeRunId, triggerType, status, errorMessage, startedAt, finishedAt]
  );

  return scrapeRunId;
}

export async function updateTrackingRun(input: {
  scrapeRunId: number;
  status: string;
  errorMessage?: string | null;
  finishedAt?: string | null;
}): Promise<void> {
  await runSql(
    `UPDATE tracking_runs
     SET status = ?,
        error_message = ?,
        finished_at = ?
     WHERE scrape_run_id = ?`,
    [
      input.status,
      input.errorMessage ?? null,
      input.finishedAt ?? new Date().toISOString(),
      input.scrapeRunId,
    ]
  );
}

export async function findTrackingRunById(
  scrapeRunId: number
): Promise<TrackingRunRow | null> {
  const row = await getRow<TrackingRunRow>(
    `SELECT
       scrape_run_id,
       trigger_type,
       status,
       error_message,
       started_at,
       finished_at,
       created_at
     FROM tracking_runs
     WHERE scrape_run_id = ?`,
    [scrapeRunId]
  );

  return row || null;
}
