import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "../auth/auth-utils";
import { trackProduct } from "@/services/tracking/track-product";
import { untrackProduct } from "@/services/tracking/untrack-product";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const requestBody = await request.json();

    await trackProduct({
      userId,
      product_url: requestBody?.product_url,
    });

    return NextResponse.json({ message: "Added Alert" });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === "Missing tracked product fields" ||
        error.message === "Tracked product was not found in source_products")
    ) {
      return NextResponse.json(
        { message: error.message },
        { status: error.message === "Missing tracked product fields" ? 400 : 404 }
      );
    }

    console.error("POST /api/tracked_products error:", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    const requestBody = await request.json();

    await untrackProduct({
      userId,
      product_url: requestBody?.product_url,
    });

    return NextResponse.json({ message: "Deleted Alert" });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Missing tracked product fields"
    ) {
      return NextResponse.json(
        { message: "Missing tracked product fields" },
        { status: 400 }
      );
    }

    console.error("DELETE /api/tracked_products error:", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}
