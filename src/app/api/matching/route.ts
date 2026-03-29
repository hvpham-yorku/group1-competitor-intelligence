import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "@/app/api/auth/auth-utils";
import {
  generateRecommendations,
  getRecommendationPage,
  getMatchingWorkspace,
  searchCompetitorProducts,
  reviewProductMatch,
  setProductMatch,
  syncStoreEmbeddings,
  unmatchProduct,
} from "@/services/matching/workspace";

export async function GET(request: Request) {
  const startedAt = Date.now();
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

      console.log("[MatchingRoute][GET][search]", {
        store_domain: storeDomain,
        query,
        result_count: results.length,
        duration_ms: Date.now() - startedAt,
      });
      return NextResponse.json(results);
    }

    const confidenceThresholdRaw = searchParams.get("threshold");
    const pageRaw = searchParams.get("page");
    const pageSizeRaw = searchParams.get("pageSize");
    const titleQuery = searchParams.get("title")?.trim() || "";
    const matchFilterRaw = searchParams.get("matchFilter");
    const confidenceThreshold = confidenceThresholdRaw
      ? Number.parseFloat(confidenceThresholdRaw)
      : undefined;
    const workspace = await getMatchingWorkspace({
      userId,
      storeDomain,
      page:
        pageRaw && Number.isFinite(Number.parseInt(pageRaw, 10))
          ? Number.parseInt(pageRaw, 10)
          : undefined,
      pageSize:
        pageSizeRaw && Number.isFinite(Number.parseInt(pageSizeRaw, 10))
          ? Number.parseInt(pageSizeRaw, 10)
          : undefined,
      titleQuery,
      matchFilter:
        matchFilterRaw === "matched" || matchFilterRaw === "unmatched" || matchFilterRaw === "all"
          ? matchFilterRaw
          : undefined,
      confidenceThreshold:
        typeof confidenceThreshold === "number" && Number.isFinite(confidenceThreshold)
          ? confidenceThreshold
          : undefined,
      includeSuggestions: false,
    });

    console.log("[MatchingRoute][GET][workspace]", {
      store_domain: storeDomain,
      page: workspace.page,
      page_size: workspace.page_size,
      total_owned_products: workspace.total_owned_products,
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Failed to load matching workspace", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      action?: "sync_embeddings" | "generate_recommendations" | "list_recommendations" | "review_match" | "unmatch" | "set_match";
      store_domain?: string;
      overwrite?: boolean;
      page?: number;
      page_size?: number;
      owned_source_product_id?: number;
      competitor_source_product_id?: number;
      score?: number;
      method?: string;
      status?: "approved" | "rejected";
    };

    if (body.action === "generate_recommendations") {
      if (!body.store_domain) {
        return NextResponse.json({ message: "Missing store_domain" }, { status: 400 });
      }

      const result = await generateRecommendations({
        userId,
        competitorStoreDomain: body.store_domain,
        page: body.page,
        pageSize: body.page_size,
      });

      console.log("[MatchingRoute][POST][generate_recommendations]", {
        store_domain: body.store_domain,
        suggestion_count: result.suggestions.length,
        provider: result.embedding_provider,
        model: result.embedding_model,
        duration_ms: Date.now() - startedAt,
      });
      return NextResponse.json(result);
    }

    if (body.action === "list_recommendations") {
      if (!body.store_domain) {
        return NextResponse.json({ message: "Missing store_domain" }, { status: 400 });
      }

      const result = await getRecommendationPage({
        userId,
        competitorStoreDomain: body.store_domain,
        page: body.page,
        pageSize: body.page_size,
      });

      return NextResponse.json(result);
    }

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

    console.log("[MatchingRoute][POST][sync_embeddings]", {
      store_domain: body.store_domain,
      processed_products: result.processed_products,
      generated_embeddings: result.generated_embeddings,
      skipped_existing_embeddings: result.skipped_existing_embeddings,
      provider: result.provider,
      model: result.model,
      duration_ms: Date.now() - startedAt,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to generate embeddings", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
