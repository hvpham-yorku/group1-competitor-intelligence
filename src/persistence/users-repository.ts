import { SqliteDB } from "@/app/api/database";

export type UserRow = {
  id: number;
  email: string;
  password: string;
  username: string;
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

export async function insertUser(input: {
  email: string;
  passwordHash: string;
  username: string;
}): Promise<void> {
  await run(
    `INSERT INTO users(email, password, username)
     VALUES(?, ?, ?)`,
    [input.email, input.passwordHash, input.username]
  );
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const user = await get<UserRow>(
    `SELECT id, email, password, username
     FROM users
     WHERE email = ?`,
    [email]
  );

  return user || null;
}
