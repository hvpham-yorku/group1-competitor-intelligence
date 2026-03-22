import { getAll, getRow, runSql } from "@/persistence/sqlite-helpers";
import {
  buildObservationHistory,
  buildRecentEvents,
} from "@/services/products/observation-utils";
import {
  parseImageUrl,
  TRACKING_SCHEDULE_LABEL,
  type TrackedProductDetail,
  type TrackedProductSummary,
} from "@/services/tracking/utils";

type ObservationRow = {
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
  source_variant_id: number | null;
  price: number | null;
  compare_at_price: number | null;
  available: number | null;
  observed_at: string | null;
};

export type ScheduledTrackedProductTarget = {
  source_product_id: number;
  product_url: string;
  user_ids: number[];
};

function buildSummary(
  rows: ObservationRow[]
): TrackedProductSummary | null {
  const first = rows[0];
  if (!first) {
    return null;
  }

  const history = buildObservationHistory(rows);
  const latest = history[0] || null;
  const previous = history[1] || null;

  return {
    tracked_id: first.tracked_id,
    source_product_id: first.source_product_id,
    title: first.product_title,
    product_url: first.product_url,
    vendor: first.vendor,
    product_type: first.product_type,
    store_domain: first.store_domain,
    store_platform: first.store_platform,
    image_url: parseImageUrl(first.images_json),
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
}): Promise<ObservationRow[]> {
  const params: unknown[] = [input.userId];
  let whereClause = `WHERE tp.user_id = ?`;

  if (typeof input.sourceProductId === "number") {
    whereClause += ` AND tp.source_product_id = ?`;
    params.push(input.sourceProductId);
  }

  return getAll<ObservationRow>(
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
       sv.id AS source_variant_id,
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
  const row = await getRow<{ id: number }>(
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
  await runSql(
    `INSERT OR IGNORE INTO tracked_products (user_id, source_product_id)
     VALUES (?, ?)`,
    [input.userId, input.sourceProductId]
  );
}

export async function deleteTrackedProduct(input: {
  userId: number;
  sourceProductId: number;
}): Promise<void> {
  await runSql(
    `DELETE FROM tracked_products
     WHERE user_id = ? AND source_product_id = ?`,
    [input.userId, input.sourceProductId]
  );
}

export async function getTrackedProductsForScheduling(): Promise<ScheduledTrackedProductTarget[]> {
  const rows = await getAll<{
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
  const grouped = new Map<number, ObservationRow[]>();

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

  const history = buildObservationHistory(rows).sort((left, right) =>
    left.observed_at.localeCompare(right.observed_at)
  );
  const recentDescending = [...history].sort((left, right) =>
    right.observed_at.localeCompare(left.observed_at)
  );
  const recentEvents = buildRecentEvents(recentDescending, 8);

  return {
    summary,
    history,
    recent_events: recentEvents,
  };
}
