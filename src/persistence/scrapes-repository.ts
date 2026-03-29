import {
  getAll,
  getRow,
  runSql,
  runSqlAndReturnLastId,
} from "@/persistence/sqlite-helpers";
import {
  buildProductsFromRows,
  type ObservationRecord,
  type ScrapeObservationRow,
  type SourceProductRecord,
  type SourceVariantRecord,
} from "@/services/scrape-runs/mappers";
import type { NormalizedProduct } from "@/services/scraper/normalized-types";
import { normalizeStoreDomain } from "@/services/scrape-runs/utils";

export type ScrapeRow = {
  id: number;
  url: string;
  created_at: string;
  resource_type?: "product" | "collection" | "store";
  products: NormalizedProduct[];
};

export type ScrapeRunSummary = {
  id: number;
  created_at: string;
  resource_type?: "product" | "collection" | "store";
};

export type LatestScrapeRunRecord = {
  id: number;
  created_at: string;
  resource_type?: "product" | "collection" | "store";
  products: NormalizedProduct[];
};

export type ScrapeSiteSummary = {
  url: string;
  runs: ScrapeRunSummary[];
  latestRun: LatestScrapeRunRecord | null;
};

export type ListScrapeSitesResult = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sites: ScrapeSiteSummary[];
};

const OBSERVATION_SELECT = `SELECT
  sp.id AS source_product_id,
  sv.id AS source_variant_id,
  sr.started_at AS created_at,
  sp.source_created_at,
  sp.source_updated_at,
  s.domain AS store_domain,
  s.platform AS store_platform,
  sp.product_url,
  sp.platform_product_id,
  sp.title AS product_title,
  sp.vendor,
  sp.product_type,
  sp.handle,
  sp.description,
  sp.tags_json,
  sp.images_json,
  sv.platform_variant_id,
  sv.variant_title,
  sv.sku,
  sv.options_json,
  sv.image_json,
  sv.product_url AS variant_product_url,
  po.price,
  po.compare_at_price,
  po.currency,
  po.available,
  po.inventory_quantity,
  po.inventory_policy,
  po.title_snapshot,
  po.variant_title_snapshot,
  po.observed_at
 FROM product_observations po
 INNER JOIN source_variants sv ON sv.id = po.source_variant_id
 INNER JOIN source_products sp ON sp.id = sv.source_product_id
 INNER JOIN stores s ON s.id = sp.store_id
 INNER JOIN scrape_runs sr ON sr.id = po.scrape_run_id`;

const tableColumnsCache = new Map<string, string[]>();

async function getTableColumns(tableName: string): Promise<string[]> {
  const cached = tableColumnsCache.get(tableName);
  if (cached) {
    return cached;
  }

  const rows = await getAll<{ name: string }>(`PRAGMA table_info(${tableName})`);
  const columns = rows.map((row) => row.name);
  tableColumnsCache.set(tableName, columns);
  return columns;
}

export async function runInTransaction<T>(
  work: () => Promise<T>
): Promise<T> {
  await runSql("BEGIN TRANSACTION");

  try {
    const result = await work();
    await runSql("COMMIT");
    return result;
  } catch (error) {
    try {
      await runSql("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to rollback scrape transaction", rollbackError);
    }
    throw error;
  }
}

export async function findOrCreateStore(domain: string, platform: string): Promise<number> {
  const existing = await getRow<{ id: number }>(
    `SELECT id FROM stores WHERE domain = ?`,
    [domain]
  );

  if (existing) {
    if (platform && platform !== "unknown") {
      await runSql(`UPDATE stores SET platform = COALESCE(NULLIF(platform, ''), ?) WHERE id = ?`, [
        platform,
        existing.id,
      ]);
    }
    return existing.id;
  }

  await runSql(
    `INSERT INTO stores (domain, platform) VALUES (?, ?)`,
    [domain, platform]
  );

  const created = await getRow<{ id: number }>(
    `SELECT id FROM stores WHERE domain = ?`,
    [domain]
  );

  if (!created) {
    throw new Error("Failed to create store");
  }

  return created.id;
}

async function userScrapeRunsHasStoreId(): Promise<boolean> {
  const columns = await getTableColumns("user_scrape_runs");
  return columns.includes("store_id");
}
async function scrapeRunsHasResourceType(): Promise<boolean> {
  const columns = await getTableColumns("scrape_runs");
  return columns.includes("resource_type");
}

export async function createScrapeRun(
  storeId?: number,
  resourceType: "product" | "collection" | "store" = "store"
): Promise<number> {
  const scrapeRunColumns = await getTableColumns("scrape_runs");

  if (
    scrapeRunColumns.includes("store_id") &&
    scrapeRunColumns.includes("resource_type") &&
    typeof storeId === "number"
  ) {
    return runSqlAndReturnLastId(
      `INSERT INTO scrape_runs (store_id, started_at, finished_at, status, resource_type)
       VALUES (?, datetime('now'), datetime('now'), 'completed', ?)`,
      [storeId, resourceType]
    );
  }

  if (scrapeRunColumns.includes("store_id") && typeof storeId === "number") {
    return runSqlAndReturnLastId(
      `INSERT INTO scrape_runs (store_id, started_at, finished_at, status)
       VALUES (?, datetime('now'), datetime('now'), 'completed')`,
      [storeId]
    );
  }

  if (scrapeRunColumns.includes("resource_type")) {
    return runSqlAndReturnLastId(
      `INSERT INTO scrape_runs (started_at, finished_at, status, resource_type)
       VALUES (datetime('now'), datetime('now'), 'completed', ?)`,
      [resourceType]
    );
  }

  return runSqlAndReturnLastId(
    `INSERT INTO scrape_runs (started_at, finished_at, status)
     VALUES (datetime('now'), datetime('now'), 'completed')`
  );
}

export async function linkUserToScrapeRun(userId: number, scrapeRunId: number, storeId: number): Promise<void> {
  const userScrapeRunColumns = await getTableColumns("user_scrape_runs");

  if (userScrapeRunColumns.includes("store_id")) {
    await runSql(
      `INSERT OR IGNORE INTO user_scrape_runs (user_id, scrape_run_id, store_id)
       VALUES (?, ?, ?)`,
      [userId, scrapeRunId, storeId]
    );
    return;
  }

  await runSql(
    `INSERT OR IGNORE INTO user_scrape_runs (user_id, scrape_run_id)
     VALUES (?, ?)`,
    [userId, scrapeRunId]
  );
}

export async function upsertSourceProduct(
  storeId: number,
  product: SourceProductRecord
): Promise<number> {
  await runSql(
    `INSERT INTO source_products (
      store_id, product_url, platform_product_id, title, vendor, product_type, handle,
      description, tags_json, images_json, source_created_at, source_updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(store_id, product_url) DO UPDATE SET
      platform_product_id = excluded.platform_product_id,
      title = excluded.title,
      vendor = excluded.vendor,
      product_type = excluded.product_type,
      handle = excluded.handle,
      description = excluded.description,
      tags_json = excluded.tags_json,
      images_json = excluded.images_json,
      source_created_at = COALESCE(excluded.source_created_at, source_products.source_created_at),
      source_updated_at = COALESCE(excluded.source_updated_at, source_products.source_updated_at)`,
    [
      storeId,
      product.productUrl,
      product.platformProductId,
      product.title,
      product.vendor,
      product.productType,
      product.handle,
      product.description,
      product.tagsJson,
      product.imagesJson,
      product.sourceCreatedAt,
      product.sourceUpdatedAt,
    ]
  );

  const row = await getRow<{ id: number }>(
    `SELECT id FROM source_products WHERE store_id = ? AND product_url = ?`,
    [storeId, product.productUrl]
  );

  if (!row) {
    throw new Error("Failed to upsert source product");
  }

  return row.id;
}

export async function upsertSourceVariant(
  sourceProductId: number,
  variant: SourceVariantRecord
): Promise<number> {
  await runSql(
    `INSERT INTO source_variants (
      source_product_id, platform_variant_id, variant_title, sku, options_json, image_json, product_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(source_product_id, platform_variant_id) DO UPDATE SET
      variant_title = excluded.variant_title,
      sku = excluded.sku,
      options_json = excluded.options_json,
      image_json = excluded.image_json,
      product_url = excluded.product_url`,
    [
      sourceProductId,
      variant.platformVariantId,
      variant.variantTitle,
      variant.sku,
      variant.optionsJson,
      variant.imageJson,
      variant.productUrl,
    ]
  );

  const row = await getRow<{ id: number }>(
    `SELECT id FROM source_variants
     WHERE source_product_id = ? AND platform_variant_id = ?`,
    [sourceProductId, variant.platformVariantId]
  );

  if (!row) {
    throw new Error("Failed to upsert source variant");
  }

  return row.id;
}

export async function insertObservation(input: {
  scrapeRunId: number;
  sourceVariantId: number;
  observation: ObservationRecord;
}): Promise<void> {
  await runSql(
    `INSERT INTO product_observations (
      scrape_run_id, source_variant_id, price, compare_at_price, currency, available,
      inventory_quantity, inventory_policy, title_snapshot, variant_title_snapshot, observed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, datetime('now')))`,
    [
      input.scrapeRunId,
      input.sourceVariantId,
      input.observation.price,
      input.observation.compareAtPrice,
      input.observation.currency,
      input.observation.available,
      input.observation.inventoryQuantity,
      input.observation.inventoryPolicy,
      input.observation.titleSnapshot,
      input.observation.variantTitleSnapshot,
      input.observation.observedAt,
    ]
  );
}

async function getObservationRowsByRunId(scrapeRunId: number): Promise<ScrapeObservationRow[]> {
  return getAll<ScrapeObservationRow>(
    `${OBSERVATION_SELECT}
     WHERE po.scrape_run_id = ?
     ORDER BY sp.id ASC, sv.id ASC`,
    [scrapeRunId]
  );
}

async function cleanupOrphanScrapeRun(scrapeRunId: number): Promise<void> {
  const remaining = await getRow<{ count: number }>(
    `SELECT COUNT(*) AS count FROM user_scrape_runs WHERE scrape_run_id = ?`,
    [scrapeRunId]
  );

  if ((remaining?.count ?? 0) === 0) {
    await runSql(`DELETE FROM scrape_runs WHERE id = ?`, [scrapeRunId]);
  }
}

export async function findScrapeRunById(
  userId: number,
  scrapeId: number
): Promise<ScrapeRow | null> {
  const hasResourceType = await scrapeRunsHasResourceType();
  const hasStoreId = await userScrapeRunsHasStoreId();
  const run = hasStoreId
    ? await getRow<{ id: number; url: string; created_at: string; resource_type?: "product" | "collection" | "store" }>(
        `SELECT sr.id, s.domain AS url, sr.started_at AS created_at${
          hasResourceType ? ", sr.resource_type" : ""
        }
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         INNER JOIN stores s ON s.id = usr.store_id
         WHERE usr.user_id = ? AND sr.id = ?`,
        [userId, scrapeId]
      )
    : await getRow<{ id: number; url: string; created_at: string; resource_type?: "product" | "collection" | "store" }>(
        `SELECT sr.id, s.domain AS url, sr.started_at AS created_at${
          hasResourceType ? ", sr.resource_type" : ""
        }
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         INNER JOIN product_observations po ON po.scrape_run_id = sr.id
         INNER JOIN source_variants sv ON sv.id = po.source_variant_id
         INNER JOIN source_products sp ON sp.id = sv.source_product_id
         INNER JOIN stores s ON s.id = sp.store_id
         WHERE usr.user_id = ? AND sr.id = ?
         LIMIT 1`,
        [userId, scrapeId]
      );

  if (!run) {
    return null;
  }

  const rows = await getObservationRowsByRunId(scrapeId);

  return {
    id: run.id,
    url: run.url,
    created_at: run.created_at,
    resource_type: run.resource_type || "store",
    products: buildProductsFromRows(rows),
  };
}

export async function findPreviousScrapeRun(
  userId: number,
  url: string,
  beforeId: number,
  resourceType?: "product" | "collection" | "store"
): Promise<ScrapeRow | null> {
  const hasResourceType = await scrapeRunsHasResourceType();
  const hasStoreId = await userScrapeRunsHasStoreId();
  const resourceTypeFilter =
    hasResourceType && resourceType ? ` AND sr.resource_type = ?` : "";
  const params = resourceTypeFilter
    ? [userId, url, beforeId, resourceType]
    : [userId, url, beforeId];
  const previous = hasStoreId
    ? await getRow<{ id: number; url: string; created_at: string; resource_type?: "product" | "collection" | "store" }>(
        `SELECT sr.id, s.domain AS url, sr.started_at AS created_at${
          hasResourceType ? ", sr.resource_type" : ""
        }
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         INNER JOIN stores s ON s.id = usr.store_id
         WHERE usr.user_id = ? AND s.domain = ? AND sr.id < ?${resourceTypeFilter}
         ORDER BY sr.id DESC
         LIMIT 1`,
        params
      )
    : await getRow<{ id: number; url: string; created_at: string; resource_type?: "product" | "collection" | "store" }>(
        `SELECT sr.id, s.domain AS url, sr.started_at AS created_at${
          hasResourceType ? ", sr.resource_type" : ""
        }
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         INNER JOIN product_observations po ON po.scrape_run_id = sr.id
         INNER JOIN source_variants sv ON sv.id = po.source_variant_id
         INNER JOIN source_products sp ON sp.id = sv.source_product_id
         INNER JOIN stores s ON s.id = sp.store_id
         WHERE usr.user_id = ? AND s.domain = ? AND sr.id < ?${resourceTypeFilter}
         ORDER BY sr.id DESC
         LIMIT 1`,
        params
      );

  if (!previous) {
    return null;
  }

  const rows = await getObservationRowsByRunId(previous.id);

  return {
    id: previous.id,
    url: previous.url,
    created_at: previous.created_at,
    resource_type: previous.resource_type || "store",
    products: buildProductsFromRows(rows),
  };
}

export async function deleteScrapeRun(
  userId: number,
  scrapeId: number
): Promise<void> {
  await runSql(
    `DELETE FROM user_scrape_runs WHERE user_id = ? AND scrape_run_id = ?`,
    [userId, scrapeId]
  );

  await cleanupOrphanScrapeRun(scrapeId);
}

export async function deleteScrapesByUrl(
  userId: number,
  url: string
): Promise<void> {
  const hasStoreId = await userScrapeRunsHasStoreId();
  const runs = hasStoreId
    ? await getAll<{ scrape_run_id: number }>(
        `SELECT usr.scrape_run_id
         FROM user_scrape_runs usr
         INNER JOIN stores s ON s.id = usr.store_id
         WHERE usr.user_id = ? AND s.domain = ?`,
        [userId, url]
      )
    : await getAll<{ scrape_run_id: number }>(
        `SELECT DISTINCT usr.scrape_run_id
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         INNER JOIN product_observations po ON po.scrape_run_id = sr.id
         INNER JOIN source_variants sv ON sv.id = po.source_variant_id
         INNER JOIN source_products sp ON sp.id = sv.source_product_id
         INNER JOIN stores s ON s.id = sp.store_id
         WHERE usr.user_id = ? AND s.domain = ?`,
        [userId, url]
      );

  for (const runRow of runs) {
    await runSql(
      `DELETE FROM user_scrape_runs WHERE user_id = ? AND scrape_run_id = ?`,
      [userId, runRow.scrape_run_id]
    );
  }
  for (const runRow of runs) {
    await cleanupOrphanScrapeRun(runRow.scrape_run_id);
  }
}

export async function findLatestStoreScrape(domain: string): Promise<ScrapeRow | null> {
  const hasResourceType = await scrapeRunsHasResourceType();
  const latest = await getRow<{ id: number; url: string; created_at: string; resource_type?: "product" | "collection" | "store" }>(
    `SELECT sr.id, s.domain AS url, sr.started_at AS created_at${
      hasResourceType ? ", sr.resource_type" : ""
    }
     FROM scrape_runs sr
     INNER JOIN product_observations po ON po.scrape_run_id = sr.id
     INNER JOIN source_variants sv ON sv.id = po.source_variant_id
     INNER JOIN source_products sp ON sp.id = sv.source_product_id
     INNER JOIN stores s ON s.id = sp.store_id
     WHERE s.domain = ?${hasResourceType ? " AND sr.resource_type = 'store'" : ""}
     ORDER BY sr.id DESC
     LIMIT 1`,
    [domain]
  );

  if (!latest) {
    return null;
  }

  const rows = await getObservationRowsByRunId(latest.id);

  return {
    id: latest.id,
    url: latest.url,
    created_at: latest.created_at,
    resource_type: latest.resource_type || "store",
    products: buildProductsFromRows(rows),
  };
}

export async function listScrapeSites(
  userId: number,
  input: { page: number; pageSize: number; query?: string }
): Promise<ListScrapeSitesResult> {
  const safePage = Number.isFinite(input.page) ? input.page : 1;
  const safePageSize = Number.isFinite(input.pageSize) ? input.pageSize : 5;
  const page = Math.max(1, safePage);
  const pageSize = Math.min(50, Math.max(1, safePageSize));
  const offset = (page - 1) * pageSize;
  const query = input.query || "";
  const hasStoreId = await userScrapeRunsHasStoreId();
  const hasResourceType = await scrapeRunsHasResourceType();

  const searchFilter = query ? `AND s.domain LIKE ?` : "";
  const searchValues = query ? [`%${query}%`] : [];
  const storeRunFilter = "";

  const rawSiteRows = hasStoreId
    ? await getAll<{ url: string; last: string; latest_run_id: number }>(
        `SELECT s.domain AS url, MAX(sr.started_at) AS last, MAX(sr.id) AS latest_run_id
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         INNER JOIN stores s ON s.id = usr.store_id
         WHERE usr.user_id = ?
         ${storeRunFilter}
         ${searchFilter}
         GROUP BY s.domain
         ORDER BY latest_run_id DESC`,
        [userId, ...searchValues]
      )
    : await getAll<{ url: string; last: string; latest_run_id: number }>(
        `SELECT s.domain AS url, MAX(sr.started_at) AS last, MAX(sr.id) AS latest_run_id
         FROM user_scrape_runs usr
         INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
         INNER JOIN product_observations po ON po.scrape_run_id = sr.id
         INNER JOIN source_variants sv ON sv.id = po.source_variant_id
         INNER JOIN source_products sp ON sp.id = sv.source_product_id
         INNER JOIN stores s ON s.id = sp.store_id
         WHERE usr.user_id = ?
         ${storeRunFilter}
         ${searchFilter}
         GROUP BY s.domain
         ORDER BY latest_run_id DESC`,
        [userId, ...searchValues]
      );

  const groupedSiteRows = new Map<string, { latest_run_id: number }>();
  for (const row of rawSiteRows) {
    const normalizedDomain = normalizeStoreDomain(row.url);
    if (!normalizedDomain) {
      continue;
    }

    const existing = groupedSiteRows.get(normalizedDomain);
    if (!existing || row.latest_run_id > existing.latest_run_id) {
      groupedSiteRows.set(normalizedDomain, { latest_run_id: row.latest_run_id });
    }
  }

  const normalizedDomains = Array.from(groupedSiteRows.entries())
    .sort((left, right) => right[1].latest_run_id - left[1].latest_run_id)
    .map(([domain]) => domain);

  const total = normalizedDomains.length;
  const pagedDomains = normalizedDomains.slice(offset, offset + pageSize);

  const rawDomainsByNormalized = new Map<string, string[]>();
  for (const row of rawSiteRows) {
    const normalizedDomain = normalizeStoreDomain(row.url);
    if (!normalizedDomain) {
      continue;
    }

    const existing = rawDomainsByNormalized.get(normalizedDomain) || [];
    if (!existing.includes(row.url)) {
      existing.push(row.url);
    }
    rawDomainsByNormalized.set(normalizedDomain, existing);
  }

  const sites = (
    await Promise.all(
    pagedDomains.map(async (domain) => {
      const rawDomains = rawDomainsByNormalized.get(domain) || [];
      const runsById = new Map<number, ScrapeRunSummary>();

      for (const rawDomain of rawDomains) {
        const runs = hasStoreId
          ? await getAll<ScrapeRunSummary>(
              `SELECT sr.id, sr.started_at AS created_at${
                hasResourceType ? ", sr.resource_type" : ""
              }
               FROM user_scrape_runs usr
               INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
               INNER JOIN stores s ON s.id = usr.store_id
               WHERE usr.user_id = ? AND s.domain = ?${storeRunFilter}
               ORDER BY sr.id DESC`,
              [userId, rawDomain]
            )
          : await getAll<ScrapeRunSummary>(
              `SELECT DISTINCT sr.id, sr.started_at AS created_at${
                hasResourceType ? ", sr.resource_type" : ""
              }
               FROM user_scrape_runs usr
               INNER JOIN scrape_runs sr ON sr.id = usr.scrape_run_id
               INNER JOIN product_observations po ON po.scrape_run_id = sr.id
               INNER JOIN source_variants sv ON sv.id = po.source_variant_id
               INNER JOIN source_products sp ON sp.id = sv.source_product_id
               INNER JOIN stores s ON s.id = sp.store_id
               WHERE usr.user_id = ? AND s.domain = ?${storeRunFilter}
               ORDER BY sr.id DESC`,
              [userId, rawDomain]
            );

        for (const run of runs) {
          runsById.set(run.id, run);
        }
      }

      const runs = Array.from(runsById.values()).sort((left, right) => right.id - left.id);
      const latestRun = runs[0]
        ? {
            id: runs[0].id,
            created_at: runs[0].created_at,
            products: buildProductsFromRows(
              await getObservationRowsByRunId(runs[0].id)
            ),
          }
        : null;

      return {
        url: domain,
        runs,
        latestRun,
      };
    })
    )
  ).filter((site) => (site.latestRun?.products.length ?? 0) > 0);

  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    sites,
  };
}
