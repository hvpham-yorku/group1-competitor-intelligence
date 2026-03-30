import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "@/app/api/auth/auth-utils";
import { getOverview } from "@/services/overview/get-overview";
import type {
  OverviewDateRange,
  OverviewDeltaDirection,
  OverviewSortKey,
  OverviewSortOrder,
} from "@/services/overview/types";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const response = await getOverview({
      userId,
      page: Number.parseInt(searchParams.get("page") ?? "1", 10),
      pageSize: Number.parseInt(searchParams.get("pageSize") ?? "20", 10),
      store: searchParams.get("store") ?? "",
      dateRange: ((searchParams.get("dateRange") as OverviewDateRange | null) ?? "7d"),
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      deltaDirection: ((searchParams.get("deltaDirection") as OverviewDeltaDirection | null) ?? "all"),
      sortKey: ((searchParams.get("sortKey") as OverviewSortKey | null) ?? "latest_seen_at"),
      sortOrder: ((searchParams.get("sortOrder") as OverviewSortOrder | null) ?? "desc"),
      query: searchParams.get("query") ?? "",
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/overview error", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
