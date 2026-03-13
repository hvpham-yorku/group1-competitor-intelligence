import { SqliteDB } from "@/persistence/database";

export type tracked_products = {
  id: number;
  user_id: number;
  title: string;
  shop: string;
  url: string;
  created_at: string;
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

export async function insertTrackedProduct(input: {
  userId: number;
  title: string;
  shop: string;
  url: string;
}): Promise<void> {
  await run(
    `INSERT OR IGNORE INTO tracked_products (user_id, title, shop, url)
     VALUES (?, ?, ?, ?)`,
    [input.userId, input.title, input.shop, input.url]
  );
}

export async function deleteTrackedProduct(input: {
  userId: number;
  url: string;
}): Promise<void> {
  await run(
    `DELETE FROM tracked_products
     WHERE user_id = ? AND url = ?`,
    [input.userId, input.url]
  );
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

export async function getTrackedProducts(): Promise<tracked_products[]> {
  return await all(`SELECT * FROM tracked_items`);
}