import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { SqliteDB } from "../../database";
import { normalizeUrl } from "../util";

export async function DELETE(request: Request) {
  // Get the current session
  const currentSession = await getServerSession(authOptions);

  // Convert the user id to a number
  const currentUserId = Number((currentSession?.user as any)?.id);

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
  const cleanedUrl = normalizeUrl(rawUrl);

  // Make sure a url was provided
  if (!cleanedUrl) {
    return NextResponse.json(
      { message: "Missing url" },
      { status: 400 }
    );
  }

  // Delete the scrape from the database
  await new Promise<void>((resolve, reject) => {
    SqliteDB.run(
      `DELETE FROM scrapes WHERE user_id = ? AND url = ?`,
      [currentUserId, cleanedUrl],
      (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });

  // Send success response
  return NextResponse.json({ message: "deleted" });
}