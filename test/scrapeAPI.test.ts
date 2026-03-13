/**
 * @jest-environment node
 */
import { SqliteDB } from "@/persistence/database"
import { getServerSession } from "next-auth"
import { GET as listSites } from "@/app/api/scrapes/sites/route"
import { DELETE as deleteRun } from "@/app/api/scrapes/run/route"
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape"


// mock session
jest.mock("next-auth", () => {
  return {
    __esModule: true,
    default: () => ({
      GET: () => { },
      POST: () => { },
    }),
    getServerSession: jest.fn(),
  }
})

// temp test database for tests
jest.mock("@/persistence/database", () => {
  const sqlite3Lib = jest.requireActual("sqlite3") as typeof import("sqlite3")
  const db = new sqlite3Lib.Database(":memory:")

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        username TEXT NOT NULL UNIQUE
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS stores(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        domain TEXT NOT NULL UNIQUE,
        platform TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS scrape_runs(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        store_id INTEGER NOT NULL,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        finished_at TEXT,
        status TEXT NOT NULL DEFAULT 'completed',
        error_message TEXT
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS source_products(
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
        platform TEXT,
        source_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(store_id, product_url)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS source_variants(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        source_product_id INTEGER NOT NULL,
        platform_variant_id TEXT,
        variant_title TEXT NOT NULL,
        sku TEXT,
        options_json TEXT,
        image_json TEXT,
        product_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(source_product_id, platform_variant_id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS user_scrape_runs(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id INTEGER NOT NULL,
        scrape_run_id INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(user_id, scrape_run_id)
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS product_observations(
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
        observed_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  })

  return { SqliteDB: db }
})


const mockSession = getServerSession as unknown as jest.Mock

describe("scrapes api", () => {
  // reset db after each test
  beforeEach(async () => {
    mockSession.mockReset()

    await new Promise<void>((resolve, reject) => {
      SqliteDB.serialize(() => {
        SqliteDB.run("DELETE FROM product_observations")
        SqliteDB.run("DELETE FROM user_scrape_runs")
        SqliteDB.run("DELETE FROM source_variants")
        SqliteDB.run("DELETE FROM source_products")
        SqliteDB.run("DELETE FROM scrape_runs")
        SqliteDB.run("DELETE FROM stores")
        SqliteDB.run("DELETE FROM users")
        SqliteDB.run(
          `INSERT INTO users (id, email, password, username)
           VALUES (1, 'user@example.com', 'hashed-password', 'tester')`,
          (err: Error | null) => (err ? reject(err) : resolve())
        )
      })
    })
  })

  test("saveScrapeRun rejects missing url", async () => {
    await expect(
      saveScrapeRun({
        userId: 1,
        rawUrl: "",
        products: [],
      })
    ).rejects.toThrow("Missing url")
  })

  test("should save products into sqlite and list them by site", async () => {
    mockSession.mockResolvedValue({ user: { id: "1" } })
    const products = [
      {
        id: "prod-1",
        title: "Barrier Restore Cream",
        vendor: "rhode",
        product_type: "Skincare",
        product_url: "https://rhodeskin.com/products/barrier-restore-cream",
        platform: "shopify",
        variants: [{ id: "var-1", title: "Default", price: "29.00", available: true, product_url: "https://rhodeskin.com/products/barrier-restore-cream" }],
      },
    ]

    await saveScrapeRun({
      userId: 1,
      rawUrl: "rhodeskin.com",
      products,
    })

    const listReq = new Request("http://localhost/api/scrapes/sites?page=1&pageSize=5")
    const listRes = await listSites(listReq)
    expect(listRes.status).toBe(200)

    const body = await listRes.json()
    expect(body.sites.length).toBe(1)
    expect(body.sites[0].url).toBe("rhodeskin.com")
    expect(body.sites[0].latestRun.products.length).toBe(1)
    expect(body.sites[0].latestRun.products[0].title).toBe("Barrier Restore Cream")
  })

  test("should delete a run", async () => {
    mockSession.mockResolvedValue({ user: { id: "1" } })

    const products = [{ id: "prod-delete", title: "Delete Me", product_url: "https://delete.com/products/delete-me", variants: [{ id: "var-delete", title: "Default", price: "1.00", available: true, product_url: "https://delete.com/products/delete-me" }] }]

    await saveScrapeRun({
      userId: 1,
      rawUrl: "delete.com",
      products,
    })

    const listRes = await listSites(new Request("http://localhost/api/scrapes/sites?page=1&pageSize=5"))
    const listBody = await listRes.json()
    const runId = listBody.sites[0].latestRun.id

    const delRes = await deleteRun(new Request(`http://localhost/api/scrapes/run?id=${runId}`, { method: "DELETE" }))
    expect(delRes.status).toBe(200)
  })
  test("should delete a specific scrape run", async () => {
    mockSession.mockResolvedValue({ user: { id: "1" } })

    const products = [
      {
        id: "prod-delete-test",
        title: "Delete Test",
        product_url: "https://delete-test.com/products/delete-test",
        variants: [{ id: "var-delete-test", title: "Default", price: "5.00", available: true, product_url: "https://delete-test.com/products/delete-test" }],
      },
    ]

    // First save a run
    await saveScrapeRun({
      userId: 1,
      rawUrl: "delete-test.com",
      products,
    })

    // Get the saved run ID
    const listRes = await listSites(
      new Request("http://localhost/api/scrapes/sites?page=1&pageSize=5")
    )
    const listBody = await listRes.json()

    const runId = listBody.sites[0].latestRun.id

    // Delete that run
    const deleteRes = await deleteRun(
      new Request(`http://localhost/api/scrapes/run?id=${runId}`, {
        method: "DELETE",
      })
    )

    expect(deleteRes.status).toBe(200)

    // Check it's gone
    const listResAfter = await listSites(
      new Request("http://localhost/api/scrapes/sites?page=1&pageSize=5")
    )
    const listBodyAfter = await listResAfter.json()

    expect(listBodyAfter.sites.length).toBe(0)
  })
})
