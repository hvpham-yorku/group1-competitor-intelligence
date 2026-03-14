import { SqliteDB } from "@/persistence/database";
import { findUserByEmail, insertUser } from "@/persistence/users-repository";

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

export async function resetIntegrationDatabase(): Promise<void> {
  await run("PRAGMA foreign_keys = OFF");
  await run("DELETE FROM tracking_runs");
  await run("DELETE FROM tracked_products");
  await run("DELETE FROM tracked_stores");
  await run("DELETE FROM product_observations");
  await run("DELETE FROM user_scrape_runs");
  await run("DELETE FROM source_variants");
  await run("DELETE FROM source_products");
  await run("DELETE FROM scrape_runs");
  await run("DELETE FROM stores");
  await run("DELETE FROM users");
  await run("DELETE FROM canonical_product_links");
  await run("DELETE FROM canonical_products");
  await run("PRAGMA foreign_keys = ON");
}

export async function createIntegrationUser(seed: string): Promise<number> {
  const email = `${seed}@example.com`;
  const username = `user_${seed.replace(/[^a-zA-Z0-9]/g, "_")}`;

  await insertUser({
    email,
    passwordHash: "integration-hash",
    username,
  });

  const user = await findUserByEmail(email);
  if (!user) {
    throw new Error("Integration user was not created");
  }

  return user.id;
}
