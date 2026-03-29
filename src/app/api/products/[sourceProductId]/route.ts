import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "@/app/api/auth/auth-utils";
import { getProductDetail } from "@/services/products/get-product-details";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceProductId: string }> }
) {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  const { sourceProductId } = await params;
  const numericId = Number(sourceProductId);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Invalid sourceProductId" }, { status: 400 });
  }

  const product = await getProductDetail({ userId, sourceProductId: numericId });
  if (!product) {
    return NextResponse.json({ message: "not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
