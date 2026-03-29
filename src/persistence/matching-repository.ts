import { getAll, getRow, runSql } from "@/persistence/sqlite-helpers";
import type {
  MatchStoreSummary,
  MatchableProduct,
} from "@/services/matching/types";

type MatchStoreRow = {
  store_domain: string;
  is_owned_store: number;
  product_count: number;
  embedded_product_count: number;
  latest_scraped_at: string | null;
};

type MatchableProductRow = {
  source_product_id: number;
  store_domain: string;
  title: string;
  product_url: string;
  images_json: string | null;
  vendor: string | null;
  product_type: string | null;
  variant_titles_csv: string | null;
  latest_price: number | null;
  latest_observed_at: string | null;
  embedding_provider: string | null;
  embedding_model: string | null;
  embedding_dimensions: number | null;
  embedded_at: string | null;
  embedding_json: string | null;
};

type ProductMatchRow = {
  owned_source_product_id: number;
  competitor_source_product_id: number;
  score: number;
  method: string;
  status: "approved" | "rejected" | "pending";
  updated_at: string;
};

type StoreEmbeddingCoverageRow = {
  provider: string;
  model: string;
  dimensions: number;
  product_count: number;
};

function mapStoreRow(row: MatchStoreRow): MatchStoreSummary {
  return {
    store_domain: row.store_domain,
    is_owned_store: row.is_owned_store === 1,
    product_count: row.product_count,
    embedded_product_count: row.embedded_product_count,
    latest_scraped_at: row.latest_scraped_at,
  };
}

function mapProductRow(row: MatchableProductRow): MatchableProduct {
  let imageUrl: string | null = null;
  if (row.images_json) {
    try {
      const parsed = JSON.parse(row.images_json) as Array<{ src?: string }>;
      imageUrl = Array.isArray(parsed) ? parsed.find((item) => typeof item?.src === "string")?.src ?? null : null;
    } catch {
      imageUrl = null;
    }
  }

  return {
    source_product_id: row.source_product_id,
    store_domain: row.store_domain,
    title: row.title,
    product_url: row.product_url,
    image_url: imageUrl,
    vendor: row.vendor,
    product_type: row.product_type,
    variant_titles: row.variant_titles_csv
      ? row.variant_titles_csv.split(",").map((value) => value.trim()).filter(Boolean)
      : [],
    latest_price: row.latest_price,
    latest_observed_at: row.latest_observed_at,
    embedding_provider: row.embedding_provider,
    embedding_model: row.embedding_model,
    embedding_dimensions: row.embedding_dimensions,
    embedded_at: row.embedded_at,
  };
}

export async function getMatchingStores(userId: number): Promise<MatchStoreSummary[]> {
  const rows = await getAll<MatchStoreRow>(
    `SELECT
       s.domain AS store_domain,
       COALESCE(ts.is_owned_store, 0) AS is_owned_store,
       COUNT(DISTINCT sp.id) AS product_count,
       COUNT(DISTINCT pe.source_product_id) AS embedded_product_count,
       MAX(sr.started_at) AS latest_scraped_at
     FROM user_scrape_runs usr
     INNER JOIN stores s ON s.id = usr.store_id
     INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
     LEFT JOIN tracked_stores ts ON ts.user_id = usr.user_id AND ts.store_id = usr.store_id
     LEFT JOIN source_products sp ON sp.store_id = s.id
     LEFT JOIN product_embeddings pe ON pe.source_product_id = sp.id
     WHERE usr.user_id = ?
     GROUP BY s.id, s.domain, COALESCE(ts.is_owned_store, 0)
     ORDER BY COALESCE(ts.is_owned_store, 0) DESC, s.domain ASC`,
    [userId]
  );

  return rows.map(mapStoreRow);
}

export async function getOwnedMatchingStore(userId: number): Promise<MatchStoreSummary | null> {
  const stores = await getMatchingStores(userId);
  return stores.find((store) => store.is_owned_store) ?? null;
}

export async function getStoreEmbeddingCoverage(input: {
  userId: number;
  storeDomain: string;
}): Promise<StoreEmbeddingCoverageRow[]> {
  return getAll<StoreEmbeddingCoverageRow>(
    `SELECT
       pe.provider,
       pe.model,
       pe.dimensions,
       COUNT(*) AS product_count
     FROM stores s
     INNER JOIN source_products sp ON sp.store_id = s.id
     INNER JOIN product_embeddings pe ON pe.source_product_id = sp.id
     WHERE s.domain = ?
       AND EXISTS (
         SELECT 1
         FROM user_scrape_runs usr
         WHERE usr.user_id = ?
           AND usr.store_id = s.id
       )
     GROUP BY pe.provider, pe.model, pe.dimensions
     ORDER BY product_count DESC, pe.provider ASC, pe.model ASC`,
    [input.storeDomain, input.userId]
  );
}

export async function getMatchableProductsByStore(input: {
  userId: number;
  storeDomain: string;
}): Promise<MatchableProduct[]> {
  const rows = await getAll<MatchableProductRow>(
    `SELECT
       sp.id AS source_product_id,
       s.domain AS store_domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type,
       GROUP_CONCAT(DISTINCT COALESCE(sv.variant_title, '')) AS variant_titles_csv,
       (
         SELECT po_latest.price
         FROM source_variants sv_latest
         INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
         WHERE sv_latest.source_product_id = sp.id
         ORDER BY po_latest.observed_at DESC, po_latest.id DESC
         LIMIT 1
       ) AS latest_price,
       (
         SELECT MAX(po_latest.observed_at)
         FROM source_variants sv_latest
         INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
         WHERE sv_latest.source_product_id = sp.id
       ) AS latest_observed_at,
       pe.provider AS embedding_provider,
       pe.model AS embedding_model,
       pe.dimensions AS embedding_dimensions,
       pe.updated_at AS embedded_at,
       pe.embedding_json
     FROM stores s
     INNER JOIN source_products sp ON sp.store_id = s.id
     LEFT JOIN source_variants sv ON sv.source_product_id = sp.id
     LEFT JOIN product_embeddings pe ON pe.source_product_id = sp.id
     WHERE s.domain = ?
       AND EXISTS (
         SELECT 1
         FROM user_scrape_runs usr
         WHERE usr.user_id = ?
           AND usr.store_id = s.id
       )
     GROUP BY
       sp.id,
       s.domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type,
      pe.provider,
      pe.model,
      pe.dimensions,
      pe.updated_at
     ORDER BY sp.title ASC`,
    [input.storeDomain, input.userId]
  );

  return rows.map(mapProductRow);
}

export async function getTitleMatchCandidatesByStore(input: {
  userId: number;
  storeDomain: string;
}): Promise<MatchableProduct[]> {
  const rows = await getAll<MatchableProductRow>(
    `SELECT
       sp.id AS source_product_id,
       s.domain AS store_domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type,
       NULL AS variant_titles_csv,
       NULL AS latest_price,
       NULL AS latest_observed_at,
       NULL AS embedding_provider,
       NULL AS embedding_model,
       NULL AS embedding_dimensions,
       NULL AS embedded_at,
       NULL AS embedding_json
     FROM stores s
     INNER JOIN source_products sp ON sp.store_id = s.id
     WHERE s.domain = ?
       AND EXISTS (
         SELECT 1
         FROM user_scrape_runs usr
         WHERE usr.user_id = ?
           AND usr.store_id = s.id
       )
     ORDER BY sp.title ASC`,
    [input.storeDomain, input.userId]
  );

  return rows.map(mapProductRow);
}

export async function getPagedMatchableProductsByStore(input: {
  userId: number;
  storeDomain: string;
  limit: number;
  offset: number;
  titleQuery?: string;
  competitorStoreDomain?: string;
  matchFilter?: "all" | "matched" | "unmatched";
}): Promise<{ products: MatchableProduct[]; total: number }> {
  const titleQuery = input.titleQuery?.trim() ?? "";
  const likeQuery = `%${titleQuery.toLowerCase()}%`;
  const applyMatchFilter =
    input.competitorStoreDomain && input.matchFilter && input.matchFilter !== "all";
  const matchExistsSql = input.competitorStoreDomain
    ? `EXISTS (
         SELECT 1
         FROM product_matches pm
         INNER JOIN source_products competitor_sp ON competitor_sp.id = pm.competitor_source_product_id
         INNER JOIN stores competitor_store ON competitor_store.id = competitor_sp.store_id
         WHERE pm.user_id = ?
           AND pm.owned_source_product_id = sp.id
           AND pm.status = 'approved'
           AND competitor_store.domain = ?
       )`
    : "0";

  const whereClauses = [
    `s.domain = ?`,
    `EXISTS (
       SELECT 1
       FROM user_scrape_runs usr
       WHERE usr.user_id = ?
         AND usr.store_id = s.id
     )`,
    titleQuery ? `LOWER(sp.title) LIKE ?` : null,
    applyMatchFilter
      ? input.matchFilter === "matched"
        ? matchExistsSql
        : `NOT ${matchExistsSql}`
      : null,
  ].filter(Boolean);

  const baseParams: unknown[] = [input.storeDomain, input.userId];
  if (titleQuery) {
    baseParams.push(likeQuery);
  }
  if (applyMatchFilter && input.competitorStoreDomain) {
    baseParams.push(input.userId, input.competitorStoreDomain);
  }

  const totalRow = await getRow<{ total: number }>(
    `SELECT COUNT(DISTINCT sp.id) AS total
     FROM stores s
     INNER JOIN source_products sp ON sp.store_id = s.id
     WHERE ${whereClauses.join("\n       AND ")}`,
    baseParams
  );

  const rows = await getAll<MatchableProductRow>(
    `SELECT
       sp.id AS source_product_id,
       s.domain AS store_domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type,
       GROUP_CONCAT(DISTINCT COALESCE(sv.variant_title, '')) AS variant_titles_csv,
       (
         SELECT po_latest.price
         FROM source_variants sv_latest
         INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
         WHERE sv_latest.source_product_id = sp.id
         ORDER BY po_latest.observed_at DESC, po_latest.id DESC
         LIMIT 1
       ) AS latest_price,
       (
         SELECT MAX(po_latest.observed_at)
         FROM source_variants sv_latest
         INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
         WHERE sv_latest.source_product_id = sp.id
       ) AS latest_observed_at,
       NULL AS embedding_provider,
       NULL AS embedding_model,
       NULL AS embedding_dimensions,
       NULL AS embedded_at,
       NULL AS embedding_json
     FROM stores s
     INNER JOIN source_products sp ON sp.store_id = s.id
     LEFT JOIN source_variants sv ON sv.source_product_id = sp.id
     WHERE ${whereClauses.join("\n       AND ")}
     GROUP BY
       sp.id,
       s.domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type
     ORDER BY sp.title ASC
     LIMIT ? OFFSET ?`,
    [...baseParams, input.limit, input.offset]
  );

  return {
    products: rows.map(mapProductRow),
    total: totalRow?.total ?? 0,
  };
}

export async function getMatchableProductsByIds(input: {
  sourceProductIds: number[];
}): Promise<MatchableProduct[]> {
  if (input.sourceProductIds.length === 0) {
    return [];
  }

  const placeholders = input.sourceProductIds.map(() => "?").join(", ");
  const rows = await getAll<MatchableProductRow>(
    `SELECT
       sp.id AS source_product_id,
       s.domain AS store_domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type,
       GROUP_CONCAT(DISTINCT COALESCE(sv.variant_title, '')) AS variant_titles_csv,
       (
         SELECT po_latest.price
         FROM source_variants sv_latest
         INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
         WHERE sv_latest.source_product_id = sp.id
         ORDER BY po_latest.observed_at DESC, po_latest.id DESC
         LIMIT 1
       ) AS latest_price,
       (
         SELECT MAX(po_latest.observed_at)
         FROM source_variants sv_latest
         INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
         WHERE sv_latest.source_product_id = sp.id
       ) AS latest_observed_at,
       NULL AS embedding_provider,
       NULL AS embedding_model,
       NULL AS embedding_dimensions,
       NULL AS embedded_at,
       NULL AS embedding_json
     FROM source_products sp
     INNER JOIN stores s ON s.id = sp.store_id
     LEFT JOIN source_variants sv ON sv.source_product_id = sp.id
     WHERE sp.id IN (${placeholders})
     GROUP BY
       sp.id,
       s.domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type`,
    input.sourceProductIds
  );

  return rows.map(mapProductRow);
}

export async function getEmbeddedProductsByStore(input: {
  userId: number;
  storeDomain: string;
  provider?: string;
  model?: string;
}): Promise<Array<MatchableProduct & { embedding: number[] }>> {
  const rows = await getAll<MatchableProductRow>(
    `SELECT
       sp.id AS source_product_id,
       s.domain AS store_domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type,
       GROUP_CONCAT(DISTINCT COALESCE(sv.variant_title, '')) AS variant_titles_csv,
       (
         SELECT po_latest.price
         FROM source_variants sv_latest
         INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
         WHERE sv_latest.source_product_id = sp.id
         ORDER BY po_latest.observed_at DESC, po_latest.id DESC
         LIMIT 1
       ) AS latest_price,
       (
         SELECT MAX(po_latest.observed_at)
         FROM source_variants sv_latest
         INNER JOIN product_observations po_latest ON po_latest.source_variant_id = sv_latest.id
         WHERE sv_latest.source_product_id = sp.id
       ) AS latest_observed_at,
       pe.provider AS embedding_provider,
       pe.model AS embedding_model,
       pe.dimensions AS embedding_dimensions,
       pe.updated_at AS embedded_at,
       pe.embedding_json
     FROM stores s
     INNER JOIN source_products sp ON sp.store_id = s.id
     LEFT JOIN source_variants sv ON sv.source_product_id = sp.id
     INNER JOIN product_embeddings pe ON pe.source_product_id = sp.id
     WHERE s.domain = ?
       AND EXISTS (
         SELECT 1
         FROM user_scrape_runs usr
         WHERE usr.user_id = ?
           AND usr.store_id = s.id
       )` +
      (input.provider ? "\n       AND pe.provider = ?" : "") +
      (input.model ? "\n       AND pe.model = ?" : "") +
      `
     GROUP BY
       sp.id,
       s.domain,
       sp.title,
       sp.product_url,
       sp.images_json,
       sp.vendor,
       sp.product_type,
       pe.provider,
       pe.model,
       pe.dimensions,
       pe.updated_at,
       pe.embedding_json
     ORDER BY sp.title ASC`,
    [
      input.storeDomain,
      input.userId,
      ...(input.provider ? [input.provider] : []),
      ...(input.model ? [input.model] : []),
    ]
  );

  return rows
    .map((row) => {
      try {
        const parsed = JSON.parse(row.embedding_json ?? "null") as number[] | null;
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return null;
        }

        return {
          ...mapProductRow(row),
          embedding: parsed,
        };
      } catch {
        return null;
      }
    })
    .filter((product): product is MatchableProduct & { embedding: number[] } => product !== null);
}

export async function upsertProductEmbedding(input: {
  sourceProductId: number;
  provider: string;
  model: string;
  dimensions: number;
  inputText: string;
  embedding: number[];
}): Promise<void> {
  await runSql(
    `INSERT INTO product_embeddings (
       source_product_id,
       provider,
       model,
       dimensions,
       input_text,
       embedding_json,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(source_product_id) DO UPDATE SET
       provider = excluded.provider,
       model = excluded.model,
       dimensions = excluded.dimensions,
       input_text = excluded.input_text,
       embedding_json = excluded.embedding_json,
       updated_at = datetime('now')`,
    [
      input.sourceProductId,
      input.provider,
      input.model,
      input.dimensions,
      input.inputText,
      JSON.stringify(input.embedding),
    ]
  );
}

export async function getProductEmbedding(sourceProductId: number): Promise<{
  source_product_id: number;
  provider: string;
  model: string;
  dimensions: number;
  input_text: string;
  embedding_json: string;
  updated_at: string;
} | null> {
  const row = await getRow<{
    source_product_id: number;
    provider: string;
    model: string;
    dimensions: number;
    input_text: string;
    embedding_json: string;
    updated_at: string;
  }>(
    `SELECT
       source_product_id,
       provider,
       model,
       dimensions,
       input_text,
       embedding_json,
       updated_at
     FROM product_embeddings
     WHERE source_product_id = ?`,
    [sourceProductId]
  );

  return row ?? null;
}

export async function upsertProductMatchDecision(input: {
  userId: number;
  ownedSourceProductId: number;
  competitorSourceProductId: number;
  score: number;
  method: string;
  status: "approved" | "rejected" | "pending";
}): Promise<void> {
  await runSql(
    `INSERT INTO product_matches (
       user_id,
       owned_source_product_id,
       competitor_source_product_id,
       score,
       method,
       status,
       updated_at
     )
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, owned_source_product_id, competitor_source_product_id) DO UPDATE SET
       score = excluded.score,
       method = excluded.method,
       status = excluded.status,
       updated_at = datetime('now')`,
    [
      input.userId,
      input.ownedSourceProductId,
      input.competitorSourceProductId,
      input.score,
      input.method,
      input.status,
    ]
  );
}

export async function deleteProductMatchDecision(input: {
  userId: number;
  ownedSourceProductId: number;
  competitorSourceProductId: number;
}): Promise<void> {
  await runSql(
    `DELETE FROM product_matches
     WHERE user_id = ?
       AND owned_source_product_id = ?
       AND competitor_source_product_id = ?`,
    [input.userId, input.ownedSourceProductId, input.competitorSourceProductId]
  );
}

export async function deleteProductMatchDecisionsForOwnedProduct(input: {
  userId: number;
  ownedSourceProductId: number;
}): Promise<void> {
  await runSql(
    `DELETE FROM product_matches
     WHERE user_id = ?
       AND owned_source_product_id = ?`,
    [input.userId, input.ownedSourceProductId]
  );
}

export async function listProductMatches(input: {
  userId: number;
  competitorStoreDomain: string;
  status?: "approved" | "rejected" | "pending";
}): Promise<ProductMatchRow[]> {
  const rows = await getAll<ProductMatchRow>(
    `SELECT
       pm.owned_source_product_id,
       pm.competitor_source_product_id,
       pm.score,
       pm.method,
       pm.status,
       pm.updated_at
     FROM product_matches pm
     INNER JOIN source_products competitor_sp
       ON competitor_sp.id = pm.competitor_source_product_id
     INNER JOIN stores competitor_store
       ON competitor_store.id = competitor_sp.store_id
     WHERE pm.user_id = ?
       AND competitor_store.domain = ?
       ${input.status ? "AND pm.status = ?" : ""}
     ORDER BY pm.score DESC, pm.updated_at DESC`,
    input.status
      ? [input.userId, input.competitorStoreDomain, input.status]
      : [input.userId, input.competitorStoreDomain]
  );

  return rows;
}

export async function listProductMatchesForOwnedProducts(input: {
  userId: number;
  competitorStoreDomain: string;
  ownedSourceProductIds: number[];
  status?: "approved" | "rejected" | "pending";
}): Promise<ProductMatchRow[]> {
  if (input.ownedSourceProductIds.length === 0) {
    return [];
  }

  const placeholders = input.ownedSourceProductIds.map(() => "?").join(", ");
  return getAll<ProductMatchRow>(
    `SELECT
       pm.owned_source_product_id,
       pm.competitor_source_product_id,
       pm.score,
       pm.method,
       pm.status,
       pm.updated_at
     FROM product_matches pm
     INNER JOIN source_products competitor_sp
       ON competitor_sp.id = pm.competitor_source_product_id
     INNER JOIN stores competitor_store
       ON competitor_store.id = competitor_sp.store_id
     WHERE pm.user_id = ?
       AND competitor_store.domain = ?
       AND pm.owned_source_product_id IN (${placeholders})
       ${input.status ? "AND pm.status = ?" : ""}
     ORDER BY pm.score DESC, pm.updated_at DESC`,
    input.status
      ? [input.userId, input.competitorStoreDomain, ...input.ownedSourceProductIds, input.status]
      : [input.userId, input.competitorStoreDomain, ...input.ownedSourceProductIds]
  );
}
