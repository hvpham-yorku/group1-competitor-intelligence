import { NextResponse } from "next/server";
import { getProductDetail } from "@/services/products/get-product-details";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sourceProductId: string }> }
) {
  const { sourceProductId } = await params;
  const numericId = Number(sourceProductId);

  if (!Number.isInteger(numericId) || numericId <= 0) {
    return NextResponse.json({ message: "Invalid sourceProductId" }, { status: 400 });
  }

  const product = await getProductDetail({ sourceProductId: numericId });
  if (!product) {
    return NextResponse.json({ message: "not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}
