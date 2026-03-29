import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "@/app/api/auth/auth-utils";
import { searchProducts } from "@/services/products/search-products";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") ?? "";
    const storeDomain = searchParams.get("store") ?? undefined;
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;

    const results = await searchProducts({
      userId,
      query,
      storeDomain,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error("Failed to search products", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
