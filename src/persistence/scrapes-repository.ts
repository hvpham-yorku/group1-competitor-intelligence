import { SqliteDB } from "@/app/api/database";

export type ScrapeRow = {
  id: number;
  user_id: number;
  url: string;
  created_at: string;
  products_json: string;
};

export type ScrapeRunSummary = {
  id: number;
  created_at: string;
};

export type LatestScrapeRunRecord = {
  id: number;
  created_at: string;
  products_json: string;
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

export async function insertScrapeRun(input: {
  userId: number;
  url: string;
  products: unknown[];
}): Promise<void> {
  await run(
    `INSERT INTO scrapes (user_id, url, products_json)
     VALUES (?, ?, ?)`,
    [input.userId, input.url, JSON.stringify(input.products)]
  );
}

export async function findScrapeRunById(
  userId: number,
  scrapeId: number
): Promise<ScrapeRow | null> {
  const row = await get<ScrapeRow>(
    `SELECT id, user_id, url, created_at, products_json
     FROM scrapes
     WHERE user_id = ? AND id = ?`,
    [userId, scrapeId]
  );
  return row || null;
}

export async function findPreviousScrapeRun(
  userId: number,
  url: string,
  beforeId: number
): Promise<Pick<ScrapeRow, "products_json"> | null> {
  const row = await get<Pick<ScrapeRow, "products_json">>(
    `SELECT products_json
     FROM scrapes
     WHERE user_id = ? AND url = ? AND id < ?
     ORDER BY id DESC
     LIMIT 1`,
    [userId, url, beforeId]
  );
  return row || null;
}

export async function deleteScrapeRun(
  userId: number,
  scrapeId: number
): Promise<void> {
  await run(`DELETE FROM scrapes WHERE user_id = ? AND id = ?`, [userId, scrapeId]);
}

export async function deleteScrapesByUrl(
  userId: number,
  url: string
): Promise<void> {
  await run(`DELETE FROM scrapes WHERE user_id = ? AND url = ?`, [userId, url]);
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

  const searchFilter = query ? `AND url LIKE ?` : "";
  const searchValues = query ? [`%${query}%`] : [];

  const totalRow = await get<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM (
       SELECT DISTINCT url
       FROM scrapes
       WHERE user_id = ?
       ${searchFilter}
     )`,
    [userId, ...searchValues]
  );
  const total = totalRow?.count ?? 0;

  const urlRows = await all<{ url: string; last: string }>(
    `SELECT url, MAX(datetime(created_at)) as last
     FROM scrapes
     WHERE user_id = ?
     ${searchFilter}
     GROUP BY url
     ORDER BY last DESC
     LIMIT ? OFFSET ?`,
    [userId, ...searchValues, pageSize, offset]
  );

  const sites = await Promise.all(
    urlRows.map(async (row) => {
      const runs = await all<ScrapeRunSummary>(
        `SELECT id, created_at
         FROM scrapes
         WHERE user_id = ? AND url = ?
         ORDER BY datetime(created_at) DESC, id DESC`,
        [userId, row.url]
      );

      const latestRun = await get<LatestScrapeRunRecord>(
        `SELECT id, created_at, products_json
         FROM scrapes
         WHERE user_id = ? AND url = ?
         ORDER BY datetime(created_at) DESC, id DESC
         LIMIT 1`,
        [userId, row.url]
      );

      return {
        url: row.url,
        runs,
        latestRun: latestRun || null,
      };
    })
  );

  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    sites,
  };
}
