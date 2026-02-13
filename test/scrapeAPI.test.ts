/**
 * @jest-environment node
 */
import { SqliteDB } from "@/app/api/database"
import { getServerSession } from "next-auth"
import { POST as saveScrape } from "@/app/api/scrapes/route"
import { GET as listSites } from "@/app/api/scrapes/sites/route"
import { DELETE as deleteRun } from "@/app/api/scrapes/run/route"


// mock session
jest.mock("next-auth", () => {
  return {
    __esModule: true,
    default: () => ({
      GET: () => {},
      POST: () => {},
    }),
    getServerSession: jest.fn(),
  }
})

// temp test database for tests
jest.mock("@/app/api/database", () => {
  const sqlite3 = require("sqlite3")
  const db = new sqlite3.Database(":memory:")

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `)

    db.run(`
      CREATE TABLE IF NOT EXISTS scrapes(
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_id INTEGER NOT NULL,
        url TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        products_json TEXT NOT NULL
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
    SqliteDB.run("DELETE FROM scrapes", (err: any) => (err ? reject(err) : resolve()))
  })
  })

  test("should block saving if not logged in", async () => {
    // Pretend no one is logged in
    mockSession.mockResolvedValue(null)

    const req = new Request("http://localhost/api/scrapes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: "random.com",
        products: [{ title: "Test Product" }],
      }),
    })

    const res = await saveScrape(req)
    expect(res.status).toBe(401)
  })

  test("should save products into sqlite when logged in", async () => {
    mockSession.mockResolvedValue({ user: { id: "1" } })

    const products = [
      {
        title: "Barrier Restore Cream",
        vendor: "rhode",
        product_type: "Skincare",
        variants: [{ price: "29.00", available: true }],
      },
    ]

    const saveReq = new Request("http://localhost/api/scrapes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "rhodeskin.com", products }),
    })

    const saveRes = await saveScrape(saveReq)
    expect(saveRes.status).toBe(200)

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

    const products = [{ title: "Delete Me", variants: [{ price: "1.00", available: true }] }]

    await saveScrape(
      new Request("http://localhost/api/scrapes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: "delete.com", products }),
      })
    )

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
      title: "Delete Test",
      variants: [{ price: "5.00", available: true }],
    },
  ]

  // First save a run
  await saveScrape(
    new Request("http://localhost/api/scrapes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "delete-test.com", products }),
    })
  )

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