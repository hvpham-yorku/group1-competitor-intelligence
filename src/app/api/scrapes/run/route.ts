import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUserIdFromSession } from "../../auth/auth-utils";
import { deleteScrapeRun } from "@/services/scrape-runs/delete-scrape";
import { getScrapeRun } from "@/services/scrape-runs/get-scrape";

export async function GET(request: Request) {
  const currentSession = await getServerSession(authOptions);
  const currentUserId = getUserIdFromSession(currentSession);

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
  const currentUserId = getUserIdFromSession(currentSession);

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
