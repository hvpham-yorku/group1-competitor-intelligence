import { getAll } from "@/persistence/sqlite-helpers";
import {
  buildObservationHistory,
  buildRecentEvents,
} from "@/services/products/observation-utils";
import {
  parseImageUrl,
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

export async function getProductDetail(sourceProductId: number): Promise<ProductDetail | null> {
  const rows = await getProductObservationRows(sourceProductId);
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

  return {
    summary,
    history,
    recent_events: recentEvents,
  };
}
