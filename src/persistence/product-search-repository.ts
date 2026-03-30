import { getAll, getRow } from "@/persistence/sqlite-helpers";
import type { ProductSearchPage, ProductSearchResult } from "@/services/products/search-types";

type ProductSearchRow = {
  source_product_id: number;
  store_domain: string;
  title: string;
  product_url: string;
  images_json: string | null;
  vendor: string | null;
  product_type: string | null;
  latest_price: number | null;
  latest_available: number | null;
  latest_inventory_quantity: number | null;
  latest_observed_at: string | null;
};

function parseImages(imagesJson: string | null): Array<{ src?: string; alt?: string }> {
  if (!imagesJson) {
    return [];
  }

  try {
    const parsed = JSON.parse(imagesJson) as Array<{ src?: string; alt?: string }>;
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item?.src === "string") : [];
  } catch {
    return [];
  }
}

function mapRow(row: ProductSearchRow): ProductSearchResult {
  const images = parseImages(row.images_json);

  return {
    source_product_id: row.source_product_id,
    store_domain: row.store_domain,
    title: row.title,
    product_url: row.product_url,
    images,
    image_url: images.find((image) => typeof image?.src === "string")?.src ?? null,
    vendor: row.vendor,
    product_type: row.product_type,
    latest_price: row.latest_price,
    latest_available: row.latest_available == null ? null : row.latest_available === 1,
    latest_inventory_quantity: row.latest_inventory_quantity,
    latest_observed_at: row.latest_observed_at,
  };
}

function buildBaseQuery(filters: { hasQuery: boolean; hasStoreDomain: boolean }) {
  const whereClauses = [
    // Product search is limited to stores the user has actually scraped through the
    // normal store-level flow so results stay within that user's dataset.
    `EXISTS (
      SELECT 1
      FROM user_scrape_runs usr
      INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
      WHERE usr.user_id = ?
        AND usr.store_id = s.id
        AND sr.resource_type = 'store'
    )`,
  ];

  if (filters.hasStoreDomain) {
    whereClauses.push("s.domain = ?");
  }

  if (filters.hasQuery) {
    whereClauses.push(`(
      sp.title LIKE ?
      OR COALESCE(sp.vendor, '') LIKE ?
      OR COALESCE(sp.product_type, '') LIKE ?
      OR sp.product_url LIKE ?
      OR s.domain LIKE ?
    )`);
  }

  return `
    SELECT
      sp.id AS source_product_id,
      s.domain AS store_domain,
      sp.title,
      sp.product_url,
      sp.images_json,
      sp.vendor,
      sp.product_type,
      (
        SELECT po_latest.price
        FROM source_variants sv_latest
        INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
        WHERE sv_latest.source_product_id = sp.id
        ORDER BY po_latest.observed_at DESC, po_latest.id DESC
        LIMIT 1
      ) AS latest_price,
      (
        SELECT po_latest.available
        FROM source_variants sv_latest
        INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
        WHERE sv_latest.source_product_id = sp.id
        ORDER BY po_latest.observed_at DESC, po_latest.id DESC
        LIMIT 1
      ) AS latest_available,
      (
        SELECT po_latest.inventory_quantity
        FROM source_variants sv_latest
        INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
        WHERE sv_latest.source_product_id = sp.id
        ORDER BY po_latest.observed_at DESC, po_latest.id DESC
        LIMIT 1
      ) AS latest_inventory_quantity,
      (
        SELECT MAX(po_latest.observed_at)
        FROM source_variants sv_latest
        INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
        WHERE sv_latest.source_product_id = sp.id
      ) AS latest_observed_at
    FROM stores s
    INNER JOIN source_products sp ON sp.store_id = s.id
    WHERE ${whereClauses.join("\n      AND ")}
    GROUP BY
      sp.id,
      s.domain,
      sp.title,
      sp.product_url,
      sp.images_json,
      sp.vendor,
      sp.product_type
  `;
}

export async function searchProductsForUser(input: {
  userId: number;
  query: string;
  storeDomain?: string;
  limit?: number;
  offset?: number;
}): Promise<ProductSearchPage> {
  const normalizedQuery = input.query.trim();
  const hasStoreDomain = Boolean(input.storeDomain);
  const like = `%${normalizedQuery}%`;
  const limit = Math.max(1, Math.min(input.limit ?? 24, 100));
  const offset = Math.max(0, input.offset ?? 0);

  const params: unknown[] = [input.userId];
  if (hasStoreDomain) {
    params.push(input.storeDomain);
  }
  params.push(like, like, like, like, like);

  const totalRow = await getRow<{ total: number }>(
    `SELECT COUNT(DISTINCT sp.id) AS total
     FROM stores s
     INNER JOIN source_products sp ON sp.store_id = s.id
     WHERE EXISTS (
         SELECT 1
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         WHERE usr.user_id = ?
           AND usr.store_id = s.id
           AND sr.resource_type = 'store'
       )` +
      (hasStoreDomain ? "\n       AND s.domain = ?" : "") +
      `
       AND (
         sp.title LIKE ?
         OR COALESCE(sp.vendor, '') LIKE ?
         OR COALESCE(sp.product_type, '') LIKE ?
         OR sp.product_url LIKE ?
         OR s.domain LIKE ?
       )`,
    params
  );

  // Exact and prefix title matches are ranked ahead of the broader LIKE matches so
  // manual product selection feels more predictable.
  params.push(normalizedQuery, `${normalizedQuery}%`, limit, offset);

  const rows = await getAll<ProductSearchRow>(
    `${buildBaseQuery({ hasQuery: true, hasStoreDomain })}
     ORDER BY
       CASE
         WHEN sp.title = ? THEN 0
         WHEN sp.title LIKE ? THEN 1
         ELSE 2
       END,
       latest_observed_at DESC,
       sp.title ASC
     LIMIT ? OFFSET ?`,
    params
  );

  return {
    items: rows.map(mapRow),
    page: Math.floor(offset / limit) + 1,
    page_size: limit,
    total: totalRow?.total ?? 0,
  };
}

export async function listSampleProductsForUser(input: {
  userId: number;
  storeDomain?: string;
  limit?: number;
  offset?: number;
}): Promise<ProductSearchPage> {
  const hasStoreDomain = Boolean(input.storeDomain);
  const limit = Math.max(1, Math.min(input.limit ?? 12, 50));
  const offset = Math.max(0, input.offset ?? 0);

  const params: unknown[] = [input.userId];
  if (hasStoreDomain) {
    params.push(input.storeDomain);
  }

  const totalRow = await getRow<{ total: number }>(
    `SELECT COUNT(DISTINCT sp.id) AS total
     FROM stores s
     INNER JOIN source_products sp ON sp.store_id = s.id
     WHERE EXISTS (
         SELECT 1
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         WHERE usr.user_id = ?
           AND usr.store_id = s.id
           AND sr.resource_type = 'store'
       )` +
      (hasStoreDomain ? "\n       AND s.domain = ?" : ""),
    params
  );

  params.push(limit, offset);

  // The sample endpoint is used for lightweight pickers, so it defaults to recency
  // instead of the heavier search ranking logic above.
  const rows = await getAll<ProductSearchRow>(
    `${buildBaseQuery({ hasQuery: false, hasStoreDomain })}
     ORDER BY latest_observed_at DESC, sp.title ASC
     LIMIT ? OFFSET ?`,
    params
  );

  return {
    items: rows.map(mapRow),
    page: Math.floor(offset / limit) + 1,
    page_size: limit,
    total: totalRow?.total ?? 0,
  };
}
