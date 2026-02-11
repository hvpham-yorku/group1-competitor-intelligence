//exports the database so it can be accessed on all server side operations

import sqlite3 from "sqlite3";
export const SqliteDB = new sqlite3.Database(
 "sqlite_database.db",
 sqlite3.OPEN_READWRITE,
 (err) => {
  if (err) {
   console.error(err.message);
  }
  console.log("Connected to the sqlite database.");
 }
);