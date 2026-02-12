import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { SqliteDB } from "../../database";
import { normalizeUrl, safeJsonParse } from "../util";

export async function GET(request: Request) {
  // Get the current logged in session
  const session = await getServerSession(authOptions);

  // Convert the session user id to a number
  const userId = Number((session?.user as any)?.id);

  // If there is no valid user, return unauthorized
  if (!userId) {
    return NextResponse.json(
      { message: "unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Parse query parameters from the URL
    const { searchParams } = new URL(request.url);

    const rawQuery = searchParams.get("query") || "";
    const query = normalizeUrl(rawQuery);

    // Get pagination values (with defaults)
    const pageParam = searchParams.get("page") || "1";
    const pageSizeParam = searchParams.get("pageSize") || "5";

    const page = Math.max(1, parseInt(pageParam, 10));
    const pageSize = Math.min(
      50,
      Math.max(1, parseInt(pageSizeParam, 10))
    );

    const offset = (page - 1) * pageSize;

    // If there is a search query, use pattern matching filter LIKE
    const searchFilter = query ? `AND url LIKE ?` : "";
    const searchValues = query ? [`%${query}%`] : [];

    // Get total number of distinct URLs for this user (for pagination)
    const total: number = await new Promise((resolve, reject) => {
      SqliteDB.get(
        `SELECT COUNT(*) as count
         FROM (
           SELECT DISTINCT url
           FROM scrapes
           WHERE user_id = ?
           ${searchFilter}
         )`,
        [userId, ...searchValues],
        (err, row: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(row?.count ?? 0);
          }
        }
      );
    });

    // Get the URLs for the current page, ordered by latest scrape
    const urlRows: { url: string; last: string }[] =
      await new Promise((resolve, reject) => {
        SqliteDB.all(
          `SELECT url, MAX(datetime(created_at)) as last
           FROM scrapes
           WHERE user_id = ?
           ${searchFilter}
           GROUP BY url
           ORDER BY last DESC
           LIMIT ? OFFSET ?`,
          [userId, ...searchValues, pageSize, offset],
          (err, rows) => {
            if (err) {
              reject(err);
            } else {
              resolve((rows as any) || []);
            }
          }
        );
      });

    // For each URL, fetch all runs and the latest run details
    const sites = await Promise.all(
      urlRows.map(async (row) => {
        const url = row.url;

        // Get all runs for this URL
        const runs: { id: number; created_at: string }[] =
          await new Promise((resolve, reject) => {
            SqliteDB.all(
              `SELECT id, created_at
               FROM scrapes
               WHERE user_id = ? AND url = ?
               ORDER BY datetime(created_at) DESC, id DESC`,
              [userId, url],
              (err, rows) => {
                if (err) {
                  reject(err);
                } else {
                  resolve((rows as any) || []);
                }
              }
            );
          });

        // Get the most recent run (including products)
        const latest: any = await new Promise((resolve, reject) => {
          SqliteDB.get(
            `SELECT id, created_at, products_json
             FROM scrapes
             WHERE user_id = ? AND url = ?
             ORDER BY datetime(created_at) DESC, id DESC
             LIMIT 1`,
            [userId, url],
            (err, row) => {
              if (err) {
                reject(err);
              } else {
                resolve(row);
              }
            }
          );
        });

        return {
          url,
          runs,
          latestRun: latest
            ? {
                id: latest.id,
                created_at: latest.created_at,
                // Safely parse products JSON
                products: safeJsonParse<any[]>(
                  latest.products_json || "[]",
                  []
                ),
              }
            : null,
        };
      })
    );

    // Return paginated response
    return NextResponse.json({
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      sites,
    });
  } catch (error) {
    console.error("Error fetching scrapes:", error);

    return NextResponse.json(
      { message: "error" },
      { status: 500 }
    );
  }
}