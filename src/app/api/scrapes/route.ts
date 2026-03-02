import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getUserIdFromSession } from "../auth/auth-utils";
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";

export async function POST(request: Request) {
  // Get the current session
  const session = await getServerSession(authOptions);
  const userId = getUserIdFromSession(session);

  // Reject if not authenticated
  if (!userId) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const rawUrl = body?.url ?? "";
    const products = Array.isArray(body?.products) ? body.products : [];

    await saveScrapeRun({
      userId,
      rawUrl,
      products,
    });

    return NextResponse.json({ message: "Saved successfully" });
  } catch (error) {
    if (error instanceof Error && error.message === "Missing url") {
      return NextResponse.json(
        { message: "Missing url" },
        { status: 400 }
      );
    }
    console.error("POST /scrapes error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
