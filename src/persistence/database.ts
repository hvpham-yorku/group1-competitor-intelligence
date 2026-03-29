import sqlite3 from "sqlite3";

const SQLITE_DB_PATH = process.env.SQLITE_DB_PATH || "database/sqlite_database.db";

export const SqliteDB = new sqlite3.Database(
  SQLITE_DB_PATH,
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error("SQLite open error:", err.message + " while opening " + SQLITE_DB_PATH);
      return;
    }
    console.log("Connected to the sqlite database.", { path: SQLITE_DB_PATH });
  }
);

function ensureUserScrapeRunsSchema() {
  SqliteDB.all<{ name: string }>(
    `PRAGMA table_info(user_scrape_runs)`,
    (error, rows) => {
      if (error) {
        console.error("SQLite user_scrape_runs schema check error:", error.message);
        return;
      }

      const columnNames = (rows || []).map((row) => row.name);
      if (
        columnNames.length === 0 ||
        !columnNames.includes("id")
      ) {
        return;
      }

      SqliteDB.serialize(() => {
        SqliteDB.run(`DROP INDEX IF EXISTS idx_user_scrape_runs_user_id`);
        SqliteDB.run(`DROP INDEX IF EXISTS idx_user_scrape_runs_scrape_run_id`);
        SqliteDB.run(`DROP TABLE IF EXISTS user_scrape_runs`);
        SqliteDB.run(
          `CREATE TABLE IF NOT EXISTS user_scrape_runs(
            user_id INTEGER NOT NULL,
            scrape_run_id INTEGER NOT NULL,
            store_id INTEGER NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            PRIMARY KEY(user_id, scrape_run_id),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(scrape_run_id) REFERENCES scrape_runs(id) ON DELETE CASCADE,
            FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
          )`
        );
        SqliteDB.run(
          `CREATE INDEX IF NOT EXISTS idx_user_scrape_runs_user_id
           ON user_scrape_runs(user_id)`
        );
        SqliteDB.run(
          `CREATE INDEX IF NOT EXISTS idx_user_scrape_runs_scrape_run_id
           ON user_scrape_runs(scrape_run_id)`
        );
      });
    }
  );
}

function ensureTrackingRunsSchema() {
  SqliteDB.all<{ name: string }>(
    `PRAGMA table_info(tracking_runs)`,
    (error, rows) => {
      if (error) {
        console.error("SQLite tracking_runs schema check error:", error.message);
        return;
      }

      const columnNames = (rows || []).map((row) => row.name);
      if (
        columnNames.length === 0 ||
        !columnNames.includes("id")
      ) {
        return;
      }

      SqliteDB.serialize(() => {
        SqliteDB.run(`DROP INDEX IF EXISTS idx_tracking_runs_scrape_run_id`);
        SqliteDB.run(`DROP INDEX IF EXISTS idx_tracking_runs_created_at`);
        SqliteDB.run(`DROP TABLE IF EXISTS tracking_runs`);
        SqliteDB.run(
          `CREATE TABLE IF NOT EXISTS tracking_runs(
            scrape_run_id INTEGER PRIMARY KEY NOT NULL,
            trigger_type TEXT NOT NULL DEFAULT 'manual',
            status TEXT NOT NULL DEFAULT 'completed',
            error_message TEXT,
            started_at TEXT NOT NULL DEFAULT (datetime('now')),
            finished_at TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY(scrape_run_id) REFERENCES scrape_runs(id) ON DELETE CASCADE
          )`
        );
        SqliteDB.run(
          `CREATE INDEX IF NOT EXISTS idx_tracking_runs_created_at
           ON tracking_runs(created_at)`
        );
      });
    }
  );
}

function ensureSourceProductsTimestampSchema() {
  SqliteDB.all<{ name: string }>(
    `PRAGMA table_info(source_products)`,
    (error, rows) => {
      if (error) {
        console.error("SQLite source_products schema check error:", error.message);
        return;
      }

      const columnNames = (rows || []).map((row) => row.name);
      if (columnNames.length === 0) {
        return;
      }

      if (!columnNames.includes("source_created_at")) {
        SqliteDB.run(`ALTER TABLE source_products ADD COLUMN source_created_at TEXT`);
      }

      if (!columnNames.includes("source_updated_at")) {
        SqliteDB.run(`ALTER TABLE source_products ADD COLUMN source_updated_at TEXT`);
      }
    }
  );
}

function ensureScrapeRunsResourceTypeSchema() {
  SqliteDB.all<{ name: string }>(
    `PRAGMA table_info(scrape_runs)`,
    (error, rows) => {
      if (error) {
        console.error("SQLite scrape_runs schema check error:", error.message);
        return;
      }

      const columnNames = (rows || []).map((row) => row.name);
      if (columnNames.length === 0) {
        return;
      }

      if (!columnNames.includes("resource_type")) {
        SqliteDB.run(
          `ALTER TABLE scrape_runs ADD COLUMN resource_type TEXT NOT NULL DEFAULT 'store'`
        );
      }
    }
  );
}

function ensureTrackedStoresOwnershipSchema() {
  SqliteDB.all<{ name: string }>(
    `PRAGMA table_info(tracked_stores)`,
    (error, rows) => {
      if (error) {
        console.error("SQLite tracked_stores schema check error:", error.message);
        return;
      }

      const columnNames = (rows || []).map((row) => row.name);
      if (columnNames.length === 0) {
        return;
      }

      if (!columnNames.includes("is_owned_store")) {
        SqliteDB.run(
          `ALTER TABLE tracked_stores ADD COLUMN is_owned_store INTEGER NOT NULL DEFAULT 0`
        );
      }

      SqliteDB.run(
        `CREATE UNIQUE INDEX IF NOT EXISTS idx_tracked_stores_owned_store
         ON tracked_stores(user_id)
         WHERE is_owned_store = 1`
      );
    }
  );
}

SqliteDB.serialize(() => {
  SqliteDB.run(`PRAGMA foreign_keys = ON`);

  // Auth and user ownership.
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE
    )`
  );

  // Shared source dataset: one store can have many scrape runs.
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS stores(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      domain TEXT NOT NULL UNIQUE,
      platform TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS scrape_runs(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'completed',
      error_message TEXT,
      resource_type TEXT NOT NULL DEFAULT 'store'
    )`
  );
  /*
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_scrape_runs_store_started_at
     ON scrape_runs(store_id, started_at)`
  );
  */
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS source_products(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      store_id INTEGER NOT NULL,
      product_url TEXT NOT NULL,
      platform_product_id TEXT,
      title TEXT NOT NULL,
      vendor TEXT,
      product_type TEXT,
      handle TEXT,
      description TEXT,
      tags_json TEXT,
      images_json TEXT,
      source_created_at TEXT,
      source_updated_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE,
      UNIQUE(store_id, product_url)
    )`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_source_products_store_url
     ON source_products(store_id, product_url)`
  );
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS source_variants(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      source_product_id INTEGER NOT NULL,
      platform_variant_id TEXT,
      variant_title TEXT NOT NULL,
      sku TEXT,
      options_json TEXT,
      image_json TEXT,
      product_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(source_product_id) REFERENCES source_products(id) ON DELETE CASCADE,
      UNIQUE(source_product_id, platform_variant_id)
    )`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_source_variants_product_id
     ON source_variants(source_product_id)`
  );
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS user_scrape_runs(
      user_id INTEGER NOT NULL,
      scrape_run_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, scrape_run_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(scrape_run_id) REFERENCES scrape_runs(id) ON DELETE CASCADE,
      FOREIGN KEY(store_id) REFERENCES stores(id) ON DELETE CASCADE
    )`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_user_scrape_runs_user_id
     ON user_scrape_runs(user_id)`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_user_scrape_runs_scrape_run_id
     ON user_scrape_runs(scrape_run_id)`
  );
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS product_observations(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      scrape_run_id INTEGER NOT NULL,
      source_variant_id INTEGER NOT NULL,
      price REAL,
      compare_at_price REAL,
      currency TEXT,
      available INTEGER,
      inventory_quantity INTEGER,
      inventory_policy TEXT,
      title_snapshot TEXT NOT NULL,
      variant_title_snapshot TEXT NOT NULL,
      observed_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(scrape_run_id) REFERENCES scrape_runs(id) ON DELETE CASCADE,
      FOREIGN KEY(source_variant_id) REFERENCES source_variants(id) ON DELETE CASCADE
    )`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_product_observations_scrape_run_id
     ON product_observations(scrape_run_id)`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_product_observations_variant_time
     ON product_observations(source_variant_id, observed_at)`
  );

  // Tracking evaluation runs sit on top of scrape history and power alerts later.
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS tracking_runs(
      scrape_run_id INTEGER PRIMARY KEY NOT NULL,
      trigger_type TEXT NOT NULL DEFAULT 'manual',
      status TEXT NOT NULL DEFAULT 'completed',
      error_message TEXT,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(scrape_run_id) REFERENCES scrape_runs(id) ON DELETE CASCADE
    )`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_tracking_runs_created_at
     ON tracking_runs(created_at)`
  );

  // Track a stable source product identity, not denormalized product text.
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS tracked_products(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      source_product_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, source_product_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(source_product_id) REFERENCES source_products(id) ON DELETE CASCADE
    )`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_tracked_products_user_product
     ON tracked_products(user_id, source_product_id)`
  );

  // Store-level monitoring subscriptions.
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS tracked_stores(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      store_id INTEGER NOT NULL,
      is_owned_store INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(store_id) REFERENCES stores(id),
      UNIQUE(user_id, store_id)
    )`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_tracked_stores_user_store
     ON tracked_stores(user_id, store_id)`
  );
  SqliteDB.run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_tracked_stores_owned_store
     ON tracked_stores(user_id)
     WHERE is_owned_store = 1`
  );

  // Future cross-vendor grouping layer.
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS canonical_products(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`
  );
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS canonical_product_links(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      canonical_product_id INTEGER NOT NULL,
      source_variant_id INTEGER NOT NULL,
      match_method TEXT,
      confidence REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(canonical_product_id) REFERENCES canonical_products(id),
      FOREIGN KEY(source_variant_id) REFERENCES source_variants(id),
      UNIQUE(canonical_product_id, source_variant_id)
    )`
  );
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_canonical_links_variant_id
     ON canonical_product_links(source_variant_id)`
  );

  ensureUserScrapeRunsSchema();
  ensureTrackingRunsSchema();
  ensureSourceProductsTimestampSchema();
  ensureScrapeRunsResourceTypeSchema();
  ensureTrackedStoresOwnershipSchema();
});
