import { SqliteDB } from "@/persistence/database";
import {
  parseImageUrl,
  type ProductDetail,
  type ProductDetailSummary,
  type ProductHistoryPoint,
} from "@/services/products/utils";

type ObservationRow = {
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

function summarizeSnapshot(rows: ObservationRow[]) {
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

function toHistory(rows: ObservationRow[]): ProductHistoryPoint[] {
  const snapshots = new Map<number, ObservationRow[]>();

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

function buildSummary(rows: ObservationRow[]): ProductDetailSummary | null {
  const first = rows[0];
  if (!first) {
    return null;
  }

  const history = toHistory(rows);
  const latest = history[0] || null;
  const previous = history[1] || null;

  return {
    source_product_id: first.source_product_id,
    title: first.product_title,
    product_url: first.product_url,
    vendor: first.vendor,
    product_type: first.product_type,
    store_domain: first.store_domain,
    store_platform: first.store_platform,
    image_url: parseImageUrl(first.images_json),
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

async function getProductObservationRows(sourceProductId: number): Promise<ObservationRow[]> {
  return all<ObservationRow>(
    `SELECT
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
     FROM source_products sp
     INNER JOIN stores s ON s.id = sp.store_id
     LEFT JOIN source_variants sv ON sv.source_product_id = sp.id
     LEFT JOIN product_observations po ON po.source_variant_id = sv.id
     LEFT JOIN scrape_runs sr ON sr.id = po.scrape_run_id
     WHERE sp.id = ?
     ORDER BY po.observed_at DESC, sv.id ASC`,
    [sourceProductId]
  );
}

export async function getProductDetail(sourceProductId: number): Promise<ProductDetail | null> {
  const rows = await getProductObservationRows(sourceProductId);
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
  const recentEvents = recentDescending.slice(0, 12).map((point, index) => {
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
