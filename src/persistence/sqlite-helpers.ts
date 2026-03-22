import { SqliteDB } from "@/persistence/database";

export function runSql(sql: string, params: unknown[] = []): Promise<void> {
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

export function getRow<T>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
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

export function getAll<T>(sql: string, params: unknown[] = []): Promise<T[]> {
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

export function runSqlAndReturnLastId(
  sql: string,
  params: unknown[] = []
): Promise<number> {
  return new Promise((resolve, reject) => {
    SqliteDB.run(sql, params, function(error: Error) {
      if (error) {
        reject(error);
      } else {
        resolve(this.lastID);
      }
    });
  });
}
