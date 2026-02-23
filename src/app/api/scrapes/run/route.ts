import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { SqliteDB } from "../../database";
import { normalizeUrl, safeJsonParse } from "../util";
import { ScraperEngine } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";

type ScrapeRow = {
  id: number;
  url: string;
  created_at: string;
  products_json: string;
};

type PreviousRunRow = {
  products_json: string;
};

function getUserIdFromSession(session: unknown): number {
  const sessionRecord =
    session && typeof session === "object"
      ? (session as Record<string, unknown>)
      : {};
  const user =
    sessionRecord.user && typeof sessionRecord.user === "object"
      ? (sessionRecord.user as Record<string, unknown>)
      : {};
  const rawId = user.id;

  if (typeof rawId === "number") {
    return rawId;
  }
  if (typeof rawId === "string") {
    const parsed = Number(rawId);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  const currentSession = await getServerSession(authOptions);
  const currentUserId = getUserIdFromSession(currentSession);

  try {
    const body = await request.json();
    const rawUrl = typeof body?.url === "string" ? body.url : "";
    const trimmedUrl = rawUrl.trim();

    if (!trimmedUrl) {
      return NextResponse.json({ message: "Missing url" }, { status: 400 });
    }

    const engine = ScraperEngine.getInstance();
    const result = await engine.execute(new ScraperRequest(trimmedUrl));
    const products = Array.isArray(result?.products) ? result.products : [];

    let saved = false;
    if (currentUserId) {
      const normalizedDbUrl = normalizeUrl(trimmedUrl);
      await insertScrape(currentUserId, normalizedDbUrl, products);
      saved = true;
    }

    return NextResponse.json({
      url: trimmedUrl,
      products,
      total_count: products.length,
      platform: result?.platform,
      saved,
    });
  } catch (error: unknown) {
    console.error("POST /api/scrapes/run error:", error);
    return NextResponse.json(
      { message: getErrorMessage(error, "Failed to execute scraper") },
      { status: 500 }
    );
  }
}

function insertScrape(
  userId: number,
  url: string,
  products: unknown[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    SqliteDB.run(
      `INSERT INTO scrapes (user_id, url, products_json)
       VALUES (?, ?, ?)`,
      [userId, url, JSON.stringify(products)],
      (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      }
    );
  });
}

export async function GET(request: Request) {
  // Get current user session
  const currentSession = await getServerSession(authOptions);
  const currentUserId = getUserIdFromSession(currentSession);

  // Make sure user is logged in
  if (!currentUserId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    // Get the scrape id from the URL
    const urlInfo = new URL(request.url);
    const scrapeId = Number(urlInfo.searchParams.get("id") || 0);

    if (!scrapeId) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    // Look up the scrape in the database
    const scrapeRecord = await new Promise<ScrapeRow | undefined>((resolve, reject) => {
      SqliteDB.get(
        `SELECT id, url, created_at, products_json
         FROM scrapes
         WHERE user_id = ? AND id = ?`,
        [currentUserId, scrapeId],
        (error, result: ScrapeRow | undefined) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );
    });

    // If we didn’t find anything, return 404
    if (!scrapeRecord) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // NEW: Fetch the previous run for the same URL to allow historical comparison
    const previousRun = await new Promise<PreviousRunRow | undefined>((resolve, reject) => {
      SqliteDB.get(
        `SELECT products_json 
         FROM scrapes 
         WHERE user_id = ? AND url = ? AND id < ? 
         ORDER BY id DESC LIMIT 1`,
        [currentUserId, scrapeRecord.url, scrapeId],
        (error, result: PreviousRunRow | undefined) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
    });

    // Send the scrape data back
    return NextResponse.json({
      id: scrapeRecord.id,
      url: scrapeRecord.url,
      created_at: scrapeRecord.created_at,
      products: safeJsonParse<unknown[]>(
        scrapeRecord.products_json || "[]",
        []
      ),
      // Include previous products for comparison if available
      previousProducts: previousRun
        ? safeJsonParse<unknown[]>(previousRun.products_json || "[]", [])
        : null,
    });
  } catch (error) {
    console.error("Error getting scrape:", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  // Get current user session
  const currentSession = await getServerSession(authOptions);
  const currentUserId = getUserIdFromSession(currentSession);

  if (!currentUserId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    // Get scrape id from URL
    const urlInfo = new URL(request.url);
    const scrapeId = Number(urlInfo.searchParams.get("id") || 0);

    if (!scrapeId) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    // Delete the scrape
    await new Promise<void>((resolve, reject) => {
      SqliteDB.run(
        `DELETE FROM scrapes WHERE user_id = ? AND id = ?`,
        [currentUserId, scrapeId],
        (error) => {
          if (error) return reject(error);
          resolve();
        }
      );
    });

    return NextResponse.json({ message: "deleted" });
  } catch (error) {
    console.error("Error deleting scrape:", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
