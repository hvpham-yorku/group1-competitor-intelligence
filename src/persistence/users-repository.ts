import { getRow, runSql } from "@/persistence/sqlite-helpers";

export type UserRow = {
  id: number;
  email: string;
  password: string;
  username: string;
};

export async function insertUser(input: {
  email: string;
  passwordHash: string;
  username: string;
}): Promise<void> {
  await runSql(
    `INSERT INTO users(email, password, username)
     VALUES(?, ?, ?)`,
    [input.email, input.passwordHash, input.username]
  );
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  const user = await getRow<UserRow>(
    `SELECT id, email, password, username
     FROM users
     WHERE email = ?`,
    [email]
  );

  return user || null;
}

export async function findUserById(id: number): Promise<UserRow | null> {
  const user = await getRow<UserRow>(
    `SELECT id, email, password, username
     FROM users
     WHERE id = ?`,
    [id]
  );

  return user || null;
}
