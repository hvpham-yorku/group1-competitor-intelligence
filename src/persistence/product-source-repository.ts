import { NormalizedProduct } from "@/services/scraper/normalized-types";
import { getAll, getRow } from "./sqlite-helpers";

export async function getSourceProductTableIdByPlatformId(ProductId: string) : Promise<number | null> {
    const row = await getAll<{id : number}>(
        `SELECT id
    FROM source_products
    WHERE platform_product_id = ?`,
        [ProductId]
    );
    //console.log(row.length);
    //console.log(ProductId);
    return row[row.length - 1].id ?? null;
}