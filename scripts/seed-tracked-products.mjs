import sqlite3 from "sqlite3";

const SAMPLE_PRODUCT_LIMIT = 6;
const PRICE_PATTERNS = [
  [-3, -1, 2, 4, 1],
  [2, 0, -1, 3, 5],
  [-2, 1, 4, 2, 0],
  [1, 3, 2, -2, -1],
  [-1, 2, 5, 3, 1],
  [0, -2, 1, 4, 6],
];

const db = new sqlite3.Database("database/sqlite_database.db");

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) {
        reject(error);
      } else {
        resolve(rows || []);
      }
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) {
        reject(error);
      } else {
        resolve(this);
      }
    });
  });
}

async function main() {
  const users = await all(
    `SELECT id, username
     FROM users
     ORDER BY id ASC`
  );

  if (users.length === 0) {
    throw new Error("No users found. Create or sign in to an account first.");
  }

  const products = await all(
    `SELECT sp.id, sp.title, sp.product_url, COUNT(DISTINCT po.scrape_run_id) AS runs
     FROM source_products sp
     LEFT JOIN source_variants sv ON sv.source_product_id = sp.id
     LEFT JOIN product_observations po ON po.source_variant_id = sv.id
     GROUP BY sp.id, sp.title, sp.product_url
     HAVING runs > 0
     ORDER BY runs DESC, sp.id ASC
     LIMIT ?`,
    [SAMPLE_PRODUCT_LIMIT]
  );

  if (products.length === 0) {
    throw new Error("No scraped products with observation history were found.");
  }

  await run("BEGIN TRANSACTION");

  try {
    for (const user of users) {
      for (const product of products) {
        await run(
          `INSERT OR IGNORE INTO tracked_products (user_id, source_product_id)
           VALUES (?, ?)`,
          [user.id, product.id]
        );
      }
    }

    for (const product of products) {
      const runs = await all(
        `SELECT DISTINCT po.scrape_run_id
         FROM source_variants sv
         INNER JOIN product_observations po ON po.source_variant_id = sv.id
         WHERE sv.source_product_id = ?
         ORDER BY po.scrape_run_id ASC`,
        [product.id]
      );

      const basePriceRow = await all(
        `SELECT po.price
         FROM source_variants sv
         INNER JOIN product_observations po ON po.source_variant_id = sv.id
         WHERE sv.source_product_id = ? AND po.price IS NOT NULL
         ORDER BY po.observed_at ASC
         LIMIT 1`,
        [product.id]
      );

      const basePrice = Number(basePriceRow[0]?.price ?? 10);
      const pattern = PRICE_PATTERNS[(product.id - 1) % PRICE_PATTERNS.length];

      for (let index = 0; index < runs.length; index += 1) {
        const scrapeRunId = runs[index].scrape_run_id;
        const nextPrice = Math.max(1, basePrice + pattern[index % pattern.length]);
        const compareAtPrice = nextPrice + Math.max(3, Math.round(nextPrice * 0.15));

        await run(
          `UPDATE product_observations
           SET price = ?,
               compare_at_price = ?
           WHERE scrape_run_id = ?
             AND source_variant_id IN (
               SELECT id
               FROM source_variants
               WHERE source_product_id = ?
             )`,
          [nextPrice, compareAtPrice, scrapeRunId, product.id]
        );
      }
    }

    await run("COMMIT");
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }

  console.log(
    JSON.stringify(
      {
        seeded_users: users.map((user) => ({
          id: user.id,
          username: user.username,
        })),
        seeded_product_count: products.length,
        seeded_products: products.map((product) => ({
          id: product.id,
          title: product.title,
          product_url: product.product_url,
          runs: product.runs,
        })),
        note: "Seeded tracked products and rewrote sample observation prices to create visible history deltas.",
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("[seed-tracked-products]", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    db.close();
  });
