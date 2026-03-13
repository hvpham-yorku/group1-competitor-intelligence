import { SqliteDB } from "@/persistence/database";

export type TrackingRunRow = {
  id: number;
  scrape_run_id: number | null;
  trigger_type: string;
  status: string;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    SqliteDB.run(sql, params, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

function get<T>(sql: string, params: unknown[] = []): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    SqliteDB.get(sql, params, (error, row) => {
      if (error) {
        reject(error);
      } else {
        resolve((row as T | undefined) || undefined);
      }
    });
  });
}

export async function insertTrackingRun(input?: {
  scrapeRunId?: number | null;
  triggerType?: string;
  status?: string;
  errorMessage?: string | null;
  startedAt?: string;
  finishedAt?: string | null;
}): Promise<number> {
  const triggerType = input?.triggerType || "manual";
  const status = input?.status || "completed";
  const errorMessage = input?.errorMessage ?? null;
  const startedAt = input?.startedAt || new Date().toISOString();
  const finishedAt = input?.finishedAt ?? null;
  const scrapeRunId = input?.scrapeRunId ?? null;

  await run(
    `INSERT INTO tracking_runs (
      scrape_run_id, trigger_type, status, error_message, started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [scrapeRunId, triggerType, status, errorMessage, startedAt, finishedAt]
  );

  const row = await get<{ id: number }>(
    `SELECT id FROM tracking_runs ORDER BY id DESC LIMIT 1`
  );

  if (!row) {
    throw new Error("Failed to create tracking run");
  }

  return row.id;
}

export async function updateTrackingRun(input: {
  id: number;
  status: string;
  errorMessage?: string | null;
  finishedAt?: string | null;
}): Promise<void> {
  await run(
    `UPDATE tracking_runs
     SET status = ?,
         error_message = ?,
         finished_at = ?
     WHERE id = ?`,
    [
      input.status,
      input.errorMessage ?? null,
      input.finishedAt ?? new Date().toISOString(),
      input.id,
    ]
  );
}

export async function findTrackingRunById(
  id: number
): Promise<TrackingRunRow | null> {
  const row = await get<TrackingRunRow>(
    `SELECT
       id,
       scrape_run_id,
       trigger_type,
       status,
       error_message,
       started_at,
       finished_at,
       created_at
     FROM tracking_runs
     WHERE id = ?`,
    [id]
  );

  return row || null;
}
