import { SqliteDB } from "@/persistence/database";

export type TrackedProductRow = {
  id: number;
  user_id: number;
  source_product_id: number;
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

export async function findSourceProductIdByUrl(
  productUrl: string
): Promise<number | null> {
  const row = await get<{ id: number }>(
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
  await run(
    `INSERT OR IGNORE INTO tracked_products (user_id, source_product_id)
     VALUES (?, ?)`,
    [input.userId, input.sourceProductId]
  );
}

export async function deleteTrackedProduct(input: {
  userId: number;
  sourceProductId: number;
}): Promise<void> {
  await run(
    `DELETE FROM tracked_products
     WHERE user_id = ? AND source_product_id = ?`,
    [input.userId, input.sourceProductId]
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

export async function getTrackedProducts(input: {
  userId: number;
}): Promise<TrackedProductRow[]> {
  return all<TrackedProductRow>(
    `SELECT id, user_id, source_product_id, created_at
     FROM tracked_products
     WHERE user_id = ?
     ORDER BY id DESC`,
    [input.userId]
  );
}
