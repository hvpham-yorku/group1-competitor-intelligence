import { SqliteDB } from "@/persistence/database";

export type TrackedProductRow = {
  id: number;
  user_id: number;
  source_product_id: number;
  created_at: string;
};

type TrackedProductObservationRow = {
  tracked_id: number;
  tracked_at: string;
  source_product_id: number;
  store_domain: string;
  store_platform: string | null;
  product_title: string;
  product_url: string;
  vendor: string | null;
  product_type: string | null;
  images_json: string | null;
  scrape_run_id: number | null;
  scrape_started_at: string | null;
  source_variant_id: number | null;
  variant_title: string | null;
  price: number | null;
  compare_at_price: number | null;
  available: number | null;
  observed_at: string | null;
};

export type TrackedProductSummary = {
  tracked_id: number;
  source_product_id: number;
  title: string;
  product_url: string;
  vendor: string | null;
  product_type: string | null;
  store_domain: string;
  store_platform: string | null;
  image_url: string | null;
  tracked_at: string;
  schedule_label: string;
  latest_price: number | null;
  previous_price: number | null;
  price_delta: number | null;
  latest_seen_at: string | null;
  latest_scrape_run_id: number | null;
};

const TRACKING_SCHEDULE_LABEL = "Daily at 01:00 UTC";

export type TrackedProductHistoryPoint = {
  scrape_run_id: number;
  observed_at: string;
  price: number | null;
  compare_at_price: number | null;
  available_variants: number;
  total_variants: number;
};

export type TrackedProductDetail = {
  summary: TrackedProductSummary;
  history: TrackedProductHistoryPoint[];
  recent_events: Array<
    TrackedProductHistoryPoint & {
      price_delta: number | null;
    }
  >;
};

export type ScheduledTrackedProductTarget = {
  source_product_id: number;
  product_url: string;
  user_ids: number[];
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

function all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    SqliteDB.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve((rows as T[]) || []);
      }
    });
  });
}

function safeParseImages(
  value: string | null
): Array<{ src?: string; alt?: string }> {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Array<{ src?: string; alt?: string }>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function summarizeSnapshot(rows: TrackedProductObservationRow[]) {
  const numericPrices = rows
    .map((row) => row.price)
    .filter((value): value is number => typeof value === "number");
  const numericComparePrices = rows
    .map((row) => row.compare_at_price)
    .filter((value): value is number => typeof value === "number");
  const availabilityRows = rows.filter(
    (row) => row.source_variant_id != null || row.scrape_run_id != null
  );

  return {
    price: numericPrices.length > 0 ? Math.min(...numericPrices) : null,
    compareAtPrice:
      numericComparePrices.length > 0 ? Math.min(...numericComparePrices) : null,
    availableVariants: rows.filter((row) => row.available === 1).length,
    totalVariants: availabilityRows.length,
  };
}

function toHistory(
  rows: TrackedProductObservationRow[]
): TrackedProductHistoryPoint[] {
  const snapshots = new Map<number, TrackedProductObservationRow[]>();

  for (const row of rows) {
    if (!row.scrape_run_id || !row.observed_at) {
      continue;
    }

    const existing = snapshots.get(row.scrape_run_id) || [];
    existing.push(row);
    snapshots.set(row.scrape_run_id, existing);
  }

  return Array.from(snapshots.entries())
    .map(([scrapeRunId, snapshotRows]) => {
      const summary = summarizeSnapshot(snapshotRows);
      const observedAt =
        snapshotRows
          .map((row) => row.observed_at)
          .filter((value): value is string => typeof value === "string")
          .sort()
          .at(-1) || "";

      return {
        scrape_run_id: scrapeRunId,
        observed_at: observedAt,
        price: summary.price,
        compare_at_price: summary.compareAtPrice,
        available_variants: summary.availableVariants,
        total_variants: summary.totalVariants,
      };
    })
    .sort((left, right) => right.observed_at.localeCompare(left.observed_at));
}

function buildSummary(
  rows: TrackedProductObservationRow[]
): TrackedProductSummary | null {
  const first = rows[0];
  if (!first) {
    return null;
  }

  const history = toHistory(rows);
  const latest = history[0] || null;
  const previous = history[1] || null;
  const firstImage = safeParseImages(first.images_json)[0];

  return {
    tracked_id: first.tracked_id,
    source_product_id: first.source_product_id,
    title: first.product_title,
    product_url: first.product_url,
    vendor: first.vendor,
    product_type: first.product_type,
    store_domain: first.store_domain,
    store_platform: first.store_platform,
    image_url: firstImage?.src || null,
    tracked_at: first.tracked_at,
    schedule_label: TRACKING_SCHEDULE_LABEL,
    latest_price: latest?.price ?? null,
    previous_price: previous?.price ?? null,
    price_delta:
      latest?.price != null && previous?.price != null
        ? latest.price - previous.price
        : null,
    latest_seen_at: latest?.observed_at ?? null,
    latest_scrape_run_id: latest?.scrape_run_id ?? null,
  };
}

async function getTrackedObservationRows(input: {
  userId: number;
  sourceProductId?: number;
}): Promise<TrackedProductObservationRow[]> {
  const params: unknown[] = [input.userId];
  let whereClause = `WHERE tp.user_id = ?`;

  if (typeof input.sourceProductId === "number") {
    whereClause += ` AND tp.source_product_id = ?`;
    params.push(input.sourceProductId);
  }

  return all<TrackedProductObservationRow>(
    `SELECT
       tp.id AS tracked_id,
       tp.created_at AS tracked_at,
       sp.id AS source_product_id,
       s.domain AS store_domain,
       s.platform AS store_platform,
       sp.title AS product_title,
       sp.product_url,
       sp.vendor,
       sp.product_type,
       sp.images_json,
       sr.id AS scrape_run_id,
       sr.started_at AS scrape_started_at,
       sv.id AS source_variant_id,
       sv.variant_title,
       po.price,
       po.compare_at_price,
       po.available,
       po.observed_at
     FROM tracked_products tp
     INNER JOIN source_products sp ON sp.id = tp.source_product_id
     INNER JOIN stores s ON s.id = sp.store_id
     LEFT JOIN source_variants sv ON sv.source_product_id = sp.id
     LEFT JOIN product_observations po ON po.source_variant_id = sv.id
     LEFT JOIN scrape_runs sr ON sr.id = po.scrape_run_id
     ${whereClause}
     ORDER BY tp.created_at DESC, sp.id ASC, po.observed_at DESC, sv.id ASC`,
    params
  );
}

export async function findSourceProductIdByUrl(
  productUrl: string
): Promise<number | null> {
  const row = await get<{ id: number }>(
    `SELECT id
     FROM source_products
     WHERE product_url = ?`,
    [productUrl]
  );

  return row?.id ?? null;
}

export async function insertTrackedProduct(input: {
  userId: number;
  sourceProductId: number;
}): Promise<void> {
  await run(
    `INSERT OR IGNORE INTO tracked_products (user_id, source_product_id)
     VALUES (?, ?)`,
    [input.userId, input.sourceProductId]
  );
}

export async function deleteTrackedProduct(input: {
  userId: number;
  sourceProductId: number;
}): Promise<void> {
  await run(
    `DELETE FROM tracked_products
     WHERE user_id = ? AND source_product_id = ?`,
    [input.userId, input.sourceProductId]
  );
}

export async function getTrackedProducts(input: {
  userId: number;
}): Promise<TrackedProductRow[]> {
  return all<TrackedProductRow>(
    `SELECT id, user_id, source_product_id, created_at
     FROM tracked_products
     WHERE user_id = ?
     ORDER BY id DESC`,
    [input.userId]
  );
}

export async function getTrackedProductsForScheduling(): Promise<ScheduledTrackedProductTarget[]> {
  const rows = await all<{
    source_product_id: number;
    product_url: string;
    user_ids_csv: string;
  }>(
    `SELECT
       tp.source_product_id,
       sp.product_url,
       GROUP_CONCAT(tp.user_id) AS user_ids_csv
     FROM tracked_products tp
     INNER JOIN source_products sp ON sp.id = tp.source_product_id
     GROUP BY tp.source_product_id, sp.product_url
     ORDER BY tp.source_product_id ASC`
  );

  return rows.map((row) => ({
    source_product_id: row.source_product_id,
    product_url: row.product_url,
    user_ids: row.user_ids_csv
      .split(",")
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0),
  }));
}

export async function getTrackedProductSummaries(input: {
  userId: number;
}): Promise<TrackedProductSummary[]> {
  const rows = await getTrackedObservationRows({ userId: input.userId });
  const grouped = new Map<number, TrackedProductObservationRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.source_product_id) || [];
    existing.push(row);
    grouped.set(row.source_product_id, existing);
  }

  return Array.from(grouped.values())
    .map((productRows) => buildSummary(productRows))
    .filter((summary): summary is TrackedProductSummary => summary !== null)
    .sort((left, right) => left.title.localeCompare(right.title));
}

export async function getTrackedProductDetail(input: {
  userId: number;
  sourceProductId: number;
}): Promise<TrackedProductDetail | null> {
  const rows = await getTrackedObservationRows(input);
  if (rows.length === 0) {
    return null;
  }

  const summary = buildSummary(rows);
  if (!summary) {
    return null;
  }

  const history = toHistory(rows).sort((left, right) =>
    left.observed_at.localeCompare(right.observed_at)
  );
  const recentDescending = [...history].sort((left, right) =>
    right.observed_at.localeCompare(left.observed_at)
  );
  const recentEvents = recentDescending.slice(0, 8).map((point, index) => {
    const previous = recentDescending[index + 1];
    return {
      ...point,
      price_delta:
        point.price != null && previous?.price != null
          ? point.price - previous.price
          : null,
    };
  });

  return {
    summary,
    history,
    recent_events: recentEvents,
  };
}
