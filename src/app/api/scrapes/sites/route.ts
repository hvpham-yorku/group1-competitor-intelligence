import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUserIdFromSession } from "../../auth/auth-utils";
import { listScrapeSites } from "@/services/scrape-runs/list-sites";
import { normalizeUrl } from "@/services/scrape-runs/utils";

export async function GET(request: Request) {
  // Get the current logged in session
  const session = await getServerSession(authOptions);

  // Convert the session user id to a number
  const userId = getUserIdFromSession(session);

  // If there is no valid user, return unauthorized
  if (!userId) {
    return NextResponse.json(
      { message: "unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Parse query parameters from the URL
    const { searchParams } = new URL(request.url);

    const rawQuery = searchParams.get("query") || "";
    const query = normalizeUrl(rawQuery);

    // Get pagination values (with defaults)
    const pageParam = searchParams.get("page") || "1";
    const pageSizeParam = searchParams.get("pageSize") || "5";

    const result = await listScrapeSites({
      userId,
      page: parseInt(pageParam, 10),
      pageSize: parseInt(pageSizeParam, 10),
      query,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching scrapes:", error);

    return NextResponse.json(
      { message: "error" },
      { status: 500 }
    );
  }
}
