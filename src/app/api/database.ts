import sqlite3 from "sqlite3";

export const SqliteDB = new sqlite3.Database(
  "database/sqlite_database.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) {
      console.error("SQLite open error:", err.message);
      return;
    }
    console.log("Connected to the sqlite database.");
  }
);

SqliteDB.serialize(() => {
  //SqliteDB.run(`DROP TABLE users`);
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS users(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE
    )`
  );

  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS scrapes(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      user_id INTEGER NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      products_json TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`
  );

  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_scrapes_user_created ON scrapes(user_id, created_at)`);
  SqliteDB.run(
    `CREATE INDEX IF NOT EXISTS idx_scrapes_user_url ON scrapes(user_id, url)`);
  
  //SqliteDB.run(`DROP TABLE tracked_items`);
  //SqliteDB.run(`DROP TABLE tracked_items_history`);
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS tracked_items(
      title TEXT PRIMARY KEY NOT NULL,
      shop TEXT NOT NULL,
      url TEXT NOT NULL)`);
  SqliteDB.run(
    `CREATE TABLE IF NOT EXISTS tracked_items_history(
      id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
      title TEXT,
      price REAL NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY(title) REFERENCES tracked_items(title))`);
});