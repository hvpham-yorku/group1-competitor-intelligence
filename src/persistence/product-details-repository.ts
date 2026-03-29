import { getAll } from "@/persistence/sqlite-helpers";
import {
  buildObservationHistory,
  buildRecentEvents,
} from "@/services/products/observation-utils";
import {
  parseImageUrl,
  type MatchedProductSummary,
  type ProductDetail,
  type ProductDetailSummary,
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

type MatchSummaryRow = {
  source_product_id: number;
  store_domain: string;
  store_platform: string | null;
  product_title: string;
  product_url: string;
  vendor: string | null;
  product_type: string | null;
  images_json: string | null;
  score: number;
  method: string;
  status: "approved" | "rejected" | "pending";
  updated_at: string;
};

function buildSummary(rows: ObservationRow[]): ProductDetailSummary | null {
  const first = rows[0];
  if (!first) {
    return null;
  }

  const history = buildObservationHistory(rows);
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

function buildMatchedProductSummary(
  row: MatchSummaryRow,
  history: ReturnType<typeof buildObservationHistory>
): MatchedProductSummary {
  const latest = history[0] || null;
  const previous = history[1] || null;

  return {
    source_product_id: row.source_product_id,
    title: row.product_title,
    product_url: row.product_url,
    vendor: row.vendor,
    product_type: row.product_type,
    store_domain: row.store_domain,
    store_platform: row.store_platform,
    image_url: parseImageUrl(row.images_json),
    latest_price: latest?.price ?? null,
    previous_price: previous?.price ?? null,
    price_delta:
      latest?.price != null && previous?.price != null
        ? latest.price - previous.price
        : null,
    latest_seen_at: latest?.observed_at ?? null,
    score: row.score,
    method: row.method,
    status: row.status,
    updated_at: row.updated_at,
  };
}

async function getProductObservationRows(sourceProductId: number): Promise<ObservationRow[]> {
  return getAll<ObservationRow>(
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

async function getMatchedProductSummaryRows(input: {
  userId: number;
  sourceProductId: number;
}): Promise<MatchSummaryRow[]> {
  return getAll<MatchSummaryRow>(
    `SELECT
       counterpart_sp.id AS source_product_id,
       counterpart_store.domain AS store_domain,
       counterpart_store.platform AS store_platform,
       counterpart_sp.title AS product_title,
       counterpart_sp.product_url,
       counterpart_sp.vendor,
       counterpart_sp.product_type,
       counterpart_sp.images_json,
       pm.score,
       pm.method,
       pm.status,
       pm.updated_at
     FROM product_matches pm
     INNER JOIN source_products counterpart_sp
       ON counterpart_sp.id = CASE
         WHEN pm.owned_source_product_id = ? THEN pm.competitor_source_product_id
         ELSE pm.owned_source_product_id
       END
     INNER JOIN stores counterpart_store ON counterpart_store.id = counterpart_sp.store_id
     WHERE pm.user_id = ?
       AND pm.status = 'approved'
       AND (pm.owned_source_product_id = ? OR pm.competitor_source_product_id = ?)
     ORDER BY pm.score DESC, pm.updated_at DESC`,
    [input.sourceProductId, input.userId, input.sourceProductId, input.sourceProductId]
  );
}

async function getProductObservationRowsForProducts(
  sourceProductIds: number[]
): Promise<ObservationRow[]> {
  if (sourceProductIds.length === 0) {
    return [];
  }

  const placeholders = sourceProductIds.map(() => "?").join(", ");
  return getAll<ObservationRow>(
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
     WHERE sp.id IN (${placeholders})
     ORDER BY sp.id ASC, po.observed_at DESC, sv.id ASC`,
    sourceProductIds
  );
}

export async function getProductDetail(input: {
  userId: number;
  sourceProductId: number;
}): Promise<ProductDetail | null> {
  const rows = await getProductObservationRows(input.sourceProductId);
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
  const recentEvents = buildRecentEvents(recentDescending, 12);
  const matchedProductRows = await getMatchedProductSummaryRows(input);
  const matchedObservationRows = await getProductObservationRowsForProducts(
    matchedProductRows.map((row) => row.source_product_id)
  );
  const matchedRowsByProductId = new Map<number, ObservationRow[]>();

  for (const row of matchedObservationRows) {
    const existing = matchedRowsByProductId.get(row.source_product_id) ?? [];
    existing.push(row);
    matchedRowsByProductId.set(row.source_product_id, existing);
  }

  const comparisonHistory = matchedProductRows.map((row) => {
    const matchedRows = matchedRowsByProductId.get(row.source_product_id) ?? [];
    const descendingHistory = buildObservationHistory(matchedRows);
    const ascendingHistory = [...descendingHistory].sort((left, right) =>
      left.observed_at.localeCompare(right.observed_at)
    );

    return {
      product: buildMatchedProductSummary(row, descendingHistory),
      history: ascendingHistory,
    };
  });

  return {
    summary,
    history,
    recent_events: recentEvents,
    matched_products: comparisonHistory.map((entry) => entry.product),
    comparison_history: comparisonHistory,
  };
}
