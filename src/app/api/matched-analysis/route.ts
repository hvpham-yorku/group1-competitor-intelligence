import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "@/app/api/auth/auth-utils";
import { getMatchedAnalysis } from "@/services/matched-analysis/get-matched-analysis";
import type {
  MatchedAnalysisDeltaDirection,
  MatchedAnalysisSortKey,
  MatchedAnalysisSortOrder,
} from "@/services/matched-analysis/types";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const response = await getMatchedAnalysis({
      userId,
      page: Number.parseInt(searchParams.get("page") ?? "1", 10),
      pageSize: Number.parseInt(searchParams.get("pageSize") ?? "20", 10),
      store: searchParams.get("store") ?? "",
      competitor: searchParams.get("competitor") ?? "",
      deltaDirection: ((searchParams.get("deltaDirection") as MatchedAnalysisDeltaDirection | null) ?? "all"),
      sortKey: ((searchParams.get("sortKey") as MatchedAnalysisSortKey | null) ?? "absolute_gap"),
      sortOrder: ((searchParams.get("sortOrder") as MatchedAnalysisSortOrder | null) ?? "desc"),
      query: searchParams.get("query") ?? "",
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/matched-analysis error", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
