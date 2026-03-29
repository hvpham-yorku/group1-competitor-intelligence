import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "@/app/api/auth/auth-utils";
import {
  getMatchingWorkspace,
  searchCompetitorProducts,
  reviewProductMatch,
  setProductMatch,
  syncStoreEmbeddings,
  unmatchProduct,
} from "@/services/matching/workspace";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const storeDomain = searchParams.get("store");
    const query = searchParams.get("q")?.trim() || "";

    if (storeDomain && query) {
      const results = await searchCompetitorProducts({
        userId,
        storeDomain,
        query,
      });

      return NextResponse.json(results);
    }

    const confidenceThresholdRaw = searchParams.get("threshold");
    const confidenceThreshold = confidenceThresholdRaw
      ? Number.parseFloat(confidenceThresholdRaw)
      : undefined;
    const workspace = await getMatchingWorkspace({
      userId,
      storeDomain,
      confidenceThreshold:
        typeof confidenceThreshold === "number" && Number.isFinite(confidenceThreshold)
          ? confidenceThreshold
          : undefined,
    });

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Failed to load matching workspace", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: "sync_embeddings" | "review_match" | "unmatch" | "set_match";
      store_domain?: string;
      overwrite?: boolean;
      owned_source_product_id?: number;
      competitor_source_product_id?: number;
      score?: number;
      method?: string;
      status?: "approved" | "rejected";
    };

    if (body.action === "set_match") {
      if (!body.owned_source_product_id || !body.competitor_source_product_id) {
        return NextResponse.json({ message: "Missing match payload" }, { status: 400 });
      }

      await setProductMatch({
        userId,
        ownedSourceProductId: body.owned_source_product_id,
        competitorSourceProductId: body.competitor_source_product_id,
      });

      return NextResponse.json({ message: "saved" });
    }

    if (body.action === "review_match") {
      if (
        !body.owned_source_product_id ||
        !body.competitor_source_product_id ||
        typeof body.score !== "number" ||
        !body.method ||
        !body.status
      ) {
        return NextResponse.json({ message: "Missing match review payload" }, { status: 400 });
      }

      await reviewProductMatch({
        userId,
        ownedSourceProductId: body.owned_source_product_id,
        competitorSourceProductId: body.competitor_source_product_id,
        score: body.score,
        method: body.method,
        status: body.status,
      });

      return NextResponse.json({ message: "saved" });
    }

    if (body.action === "unmatch") {
      if (!body.owned_source_product_id || !body.competitor_source_product_id) {
        return NextResponse.json({ message: "Missing unmatch payload" }, { status: 400 });
      }

      await unmatchProduct({
        userId,
        ownedSourceProductId: body.owned_source_product_id,
        competitorSourceProductId: body.competitor_source_product_id,
      });

      return NextResponse.json({ message: "deleted" });
    }

    if (!body.store_domain) {
      return NextResponse.json({ message: "Missing store_domain" }, { status: 400 });
    }

    const result = await syncStoreEmbeddings({
      userId,
      storeDomain: body.store_domain,
      overwrite: body.overwrite === true,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to generate embeddings", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
