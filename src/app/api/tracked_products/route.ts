import { NextResponse } from "next/server";
import { SqliteDB } from "../database";


function run(sql: string, params: unknown[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    SqliteDB.run(sql, params, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

export async function POST(request: Request) {
    const RequestBody = (await request.json());
    console.log(RequestBody);
    let title : string = RequestBody.title;
    let shop : string = RequestBody.platform;
    let url : string = RequestBody.product_url;
    run(`INSERT INTO tracked_items (title, shop, url)
     VALUES (?, ?, ?)`, [title, shop, url]);
    return NextResponse.json({ message: "Added Alert" });
}

export async function DELETE(request: Request) {
    const RequestBody = (await request.json());
    console.log(RequestBody);
    //console.log("deleetd response");
    let title : string = RequestBody.title;
    run(`DELETE FROM tracked_items WHERE title = ?`, [title]);
    return NextResponse.json({ message: "Deleted Alert" });
}