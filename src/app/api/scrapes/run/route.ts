import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "../../auth/auth-utils";
import { deleteScrapeRun } from "@/services/scrape-runs/delete-scrape";
import { getScrapeRun } from "@/services/scrape-runs/get-scrape";
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";
import { ScraperEngine } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";
import { initializeScheduledScraping } from "@/services/scheduled_scraping/scheduled_scraping";

initializeScheduledScraping();

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(request: Request) {
  const currentSession = await getServerSession(authOptions);
  const currentUserId = await getExistingUserIdFromSession(currentSession);

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
      const scrapeRequest = new ScraperRequest(trimmedUrl);
      const resourceType = scrapeRequest.resourceType;
      await saveScrapeRun({
        userId: currentUserId,
        rawUrl: trimmedUrl,
        products,
        resourceType,
      });
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

export async function GET(request: Request) {
  const currentSession = await getServerSession(authOptions);
  const currentUserId = await getExistingUserIdFromSession(currentSession);

  if (!currentUserId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const urlInfo = new URL(request.url);
    const scrapeId = Number(urlInfo.searchParams.get("id") || 0);

    if (!scrapeId) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    const scrapeRecord = await getScrapeRun({
      userId: currentUserId,
      scrapeId,
    });

    if (!scrapeRecord) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    return NextResponse.json(scrapeRecord);
  } catch (error) {
    console.error("Error getting scrape:", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const currentSession = await getServerSession(authOptions);
  const currentUserId = await getExistingUserIdFromSession(currentSession);

  if (!currentUserId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const urlInfo = new URL(request.url);
    const scrapeId = Number(urlInfo.searchParams.get("id") || 0);

    if (!scrapeId) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    await deleteScrapeRun({
      userId: currentUserId,
      scrapeId,
    });

    return NextResponse.json({ message: "deleted" });
  } catch (error) {
    console.error("Error deleting scrape:", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
