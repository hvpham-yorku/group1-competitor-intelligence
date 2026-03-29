import { getAll, getRow, runSql } from "@/persistence/sqlite-helpers";
import { normalizeStoreDomain } from "@/services/scrape-runs/utils";
import {
  TRACKING_SCHEDULE_LABEL,
  type TrackedStoreSummary,
} from "@/services/tracking/utils";

export type ScheduledTrackedStoreTarget = {
  store_id: number;
  store_domain: string;
  user_ids: number[];
};

type TrackedStoreRow = {
  tracked_id: number;
  tracked_at: string;
  store_id: number;
  store_domain: string;
  store_platform: string | null;
  latest_scrape_run_id: number | null;
  latest_scraped_at: string | null;
  is_owned_store: number;
};

export async function findStoreIdByUrl(storeUrl: string): Promise<number | null> {
  const normalizedDomain = normalizeStoreDomain(storeUrl);
  if (!normalizedDomain) {
    return null;
  }

  const row = await getRow<{ id: number }>(
    `SELECT id FROM stores WHERE domain = ?`,
    [normalizedDomain]
  );

  return row?.id ?? null;
}

export async function upsertTrackedStore(input: {
  userId: number;
  storeId: number;
  isOwnedStore?: boolean;
}): Promise<void> {
  if (input.isOwnedStore) {
    await runSql(
      `UPDATE tracked_stores
       SET is_owned_store = 0
       WHERE user_id = ?`,
      [input.userId]
    );
  }

  await runSql(
    `INSERT INTO tracked_stores (user_id, store_id, is_owned_store)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id, store_id) DO UPDATE SET
       is_owned_store = excluded.is_owned_store`,
    [input.userId, input.storeId, input.isOwnedStore ? 1 : 0]
  );
}

export async function deleteTrackedStore(input: {
  userId: number;
  storeId: number;
}): Promise<void> {
  await runSql(
    `DELETE FROM tracked_stores
     WHERE user_id = ? AND store_id = ?`,
    [input.userId, input.storeId]
  );
}

export async function userHasTrackedStoreScrape(input: {
  userId: number;
  storeId: number;
}): Promise<boolean> {
  const row = await getRow<{ count: number }>(
    `SELECT COUNT(*) AS count
     FROM user_scrape_runs usr
     INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
     WHERE usr.user_id = ?
       AND usr.store_id = ?
       AND sr.resource_type = 'store'`,
    [input.userId, input.storeId]
  );

  return (row?.count ?? 0) > 0;
}

export async function getTrackedStoresForScheduling(): Promise<ScheduledTrackedStoreTarget[]> {
  const rows = await getAll<{
    store_id: number;
    store_domain: string;
    user_ids_csv: string;
  }>(
    `SELECT
       ts.store_id,
       s.domain AS store_domain,
       GROUP_CONCAT(ts.user_id) AS user_ids_csv
     FROM tracked_stores ts
     INNER JOIN stores s ON s.id = ts.store_id
     GROUP BY ts.store_id, s.domain
     ORDER BY ts.store_id ASC`
  );

  return rows.map((row) => ({
    store_id: row.store_id,
    store_domain: row.store_domain,
    user_ids: row.user_ids_csv
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  }));
}

export async function getTrackedStoreSummaries(input: {
  userId: number;
}): Promise<TrackedStoreSummary[]> {
  const rows = await getAll<TrackedStoreRow>(
    `SELECT
       ts.id AS tracked_id,
       ts.created_at AS tracked_at,
       ts.is_owned_store AS is_owned_store,
       s.id AS store_id,
       s.domain AS store_domain,
       s.platform AS store_platform,
       latest.id AS latest_scrape_run_id,
       latest.started_at AS latest_scraped_at
     FROM tracked_stores ts
     INNER JOIN stores s ON s.id = ts.store_id
     LEFT JOIN (
       SELECT
         usr.store_id,
         sr.id,
         sr.started_at,
         ROW_NUMBER() OVER (
           PARTITION BY usr.store_id
           ORDER BY sr.id DESC
         ) AS row_num
       FROM user_scrape_runs usr
       INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
       WHERE usr.user_id = ?
         AND sr.resource_type = 'store'
     ) latest
       ON latest.store_id = s.id
      AND latest.row_num = 1
     WHERE ts.user_id = ?
     ORDER BY ts.is_owned_store DESC, s.domain ASC`,
    [input.userId, input.userId]
  );

  return rows.map((row) => ({
    tracked_id: row.tracked_id,
    store_id: row.store_id,
    store_domain: row.store_domain,
    store_platform: row.store_platform,
    tracked_at: row.tracked_at,
    schedule_label: TRACKING_SCHEDULE_LABEL,
    latest_scrape_run_id: row.latest_scrape_run_id,
    latest_scraped_at: row.latest_scraped_at,
    is_owned_store: row.is_owned_store === 1,
  }));
}
