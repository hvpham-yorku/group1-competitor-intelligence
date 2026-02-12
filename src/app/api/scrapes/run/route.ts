import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { SqliteDB } from "../../database";
import { safeJsonParse } from "../util";

export async function GET(request: Request) {
  // Get current user session
  const currentSession = await getServerSession(authOptions);
  const currentUserId = Number((currentSession?.user as any)?.id);

  // Make sure user is logged in
  if (!currentUserId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    // Get the scrape id from the URL
    const urlInfo = new URL(request.url);
    const scrapeId = Number(urlInfo.searchParams.get("id") || 0);

    if (!scrapeId) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    // Look up the scrape in the database
    const scrapeRecord: any = await new Promise((resolve, reject) => {
      SqliteDB.get(
        `SELECT id, url, created_at, products_json
         FROM scrapes
         WHERE user_id = ? AND id = ?`,
        [currentUserId, scrapeId],
        (error, result) => {
          if (error){
            return reject(error);
          } 
          resolve(result);
        }
      );
    });

    // If we didn’t find anything, return 404
    if (!scrapeRecord) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    // Send the scrape data back
    return NextResponse.json({
      id: scrapeRecord.id,
      url: scrapeRecord.url,
      created_at: scrapeRecord.created_at,
      products: safeJsonParse<any[]>(
        scrapeRecord.products_json || "[]",
        []
      ),
    });
  } catch (error) {
    console.error("Error getting scrape:", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  // Get current user session
  const currentSession = await getServerSession(authOptions);
  const currentUserId = Number((currentSession?.user as any)?.id);

  if (!currentUserId) {
    return NextResponse.json({ message: "unauthorized" }, { status: 401 });
  }

  try {
    // Get scrape id from URL
    const urlInfo = new URL(request.url);
    const scrapeId = Number(urlInfo.searchParams.get("id") || 0);

    if (!scrapeId) {
      return NextResponse.json({ message: "Missing id" }, { status: 400 });
    }

    // Delete the scrape
    await new Promise<void>((resolve, reject) => {
      SqliteDB.run(
        `DELETE FROM scrapes WHERE user_id = ? AND id = ?`,
        [currentUserId, scrapeId],
        (error) => {
          if (error) return reject(error);
          resolve();
        }
      );
    });

    return NextResponse.json({ message: "deleted" });
  } catch (error) {
    console.error("Error deleting scrape:", error);
    return NextResponse.json({ message: "error" }, { status: 500 });
  }
}