import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getUserIdFromSession } from "../../auth/auth-utils";
import { deleteSiteHistory } from "@/services/scrape-runs/delete-site-history";

export async function DELETE(request: Request) {
  // Get the current session
  const currentSession = await getServerSession(authOptions);

  // Convert the user id to a number
  const currentUserId = getUserIdFromSession(currentSession);

  // If user is not logged in, return unauthorized
  if (!currentUserId) {
    return NextResponse.json(
      { message: "unauthorized" },
      { status: 401 }
    );
  }

  // Get the URL from the query string (?url=example.com)
  const urlObject = new URL(request.url);
  const searchParams = urlObject.searchParams;

  const rawUrl = searchParams.get("url") || "";
  try {
    await deleteSiteHistory({
      userId: currentUserId,
      rawUrl,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Missing url") {
      return NextResponse.json(
        { message: "Missing url" },
        { status: 400 }
      );
    }
    console.error("Error deleting site history:", error);
    return NextResponse.json(
      { message: "error" },
      { status: 500 }
    );
  }

  // Send success response
  return NextResponse.json({ message: "deleted" });
}
