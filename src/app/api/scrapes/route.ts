import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { SqliteDB } from "../database";
import { normalizeUrl } from "./util";

export async function POST(request: Request) {
  // Get the current session
  const session = await getServerSession(authOptions);
  const userId = Number((session?.user as any)?.id);

  // Reject if not authenticated
  if (!userId) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Parse request body
    const body = await request.json();
    const rawUrl = body?.url ?? "";
    const products = Array.isArray(body?.products) ? body.products : [];

    const url = normalizeUrl(rawUrl);

    if (!url) {
      return NextResponse.json(
        { message: "Missing url" },
        { status: 400 }
      );
    }

    // Insert into database
    await insertScrape(userId, url, products);

    return NextResponse.json({ message: "Saved successfully" });
  } catch (error) {
    console.error("POST /scrapes error:", error);

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}


 // Inserts a scraped record into the database
function insertScrape(
  userId: number,
  url: string,
  products: unknown[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    SqliteDB.run(
      `INSERT INTO scrapes (user_id, url, products_json)
       VALUES (?, ?, ?)`,
      [userId, url, JSON.stringify(products)],
      (err) => {
        if (err){
            return reject(err);
        }
        resolve();
      }
    );
  });
}