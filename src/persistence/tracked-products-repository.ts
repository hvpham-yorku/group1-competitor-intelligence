import { SqliteDB } from "@/app/api/database";

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
