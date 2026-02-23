import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { SqliteDB } from "../../../database";
import { normalizeUrl } from "../../util";
import { ScraperEngine, ScraperExecutionError } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";
import type { ScrapeProgress } from "@/services/scraper/strategies/interface";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function sseData(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = (searchParams.get("url") || "").trim();

  if (!rawUrl) {
    return NextResponse.json({ message: "Missing url" }, { status: 400 });
  }

  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const write = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(sseData(event, payload)));
      };

      write("start", { message: "Scrape started", url: rawUrl });

      (async () => {
        try {
          const engine = ScraperEngine.getInstance();
          const result = await engine.execute(
            new ScraperRequest(rawUrl),
            (progress: ScrapeProgress) => {
              write("progress", progress);
            }
          );

          const products = Array.isArray(result?.products) ? result.products : [];
          let saved = false;
          if (userId) {
            await insertScrape(userId, normalizeUrl(rawUrl), products);
            saved = true;
          }

          write("done", {
            url: rawUrl,
            products,
            total_count: products.length,
            platform: result?.platform,
            saved,
          });
        } catch (error: unknown) {
          if (error instanceof ScraperExecutionError) {
            console.warn("Scrape execution blocked/failed", {
              reason: error.reason,
              attempts: error.attempts,
              url: rawUrl,
            });
          }

          write("error", {
            message: error instanceof Error ? error.message : "Failed to execute scraper",
            reason: error instanceof ScraperExecutionError ? error.reason : "unknown",
            attempts: error instanceof ScraperExecutionError ? error.attempts : [],
          });
        } finally {
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
