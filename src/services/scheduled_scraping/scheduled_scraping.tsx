import cron from "node-cron";
import { getTrackedProductsForScheduling } from "@/persistence/tracked-products-repository";
import { getTrackedStoresForScheduling } from "@/persistence/tracked-stores-repository";
import { insertTrackingRun } from "@/persistence/tracking-runs-repository";
import { saveScrapeRun } from "@/services/scrape-runs/save-scrape";
import { ScraperEngine } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";
import {getSourceProductTableIdByPlatformId } from "@/persistence/product-source-repository";
import { sendNotificationEmail } from "../email_alerts/email_alerts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { JSX } from "react";
import { getProductDetail } from "@/persistence/product-details-repository";
import { findUserById } from "@/persistence/users-repository";
import { User } from "lucide-react";

declare global {
  var __trackingSchedulerInitialized: boolean | undefined;
  var __trackingSchedulerRunning: boolean | undefined;
}

interface changed_products{
  Title: string;
  OldPrice: number;
  NewPrice: number;
}

async function scrapeTrackedItem(request: ScraperRequest, user_ids: number[] | undefined, url: string){
  const startedAt = new Date();
  const engine = ScraperEngine.getInstance();
  const result = await engine.execute(request);
  

  let ChangedProducts : changed_products[] = [];
  for(let Product of result?.products){
    
    let SourceProductTableId = await getSourceProductTableIdByPlatformId(Product.id?.toString() as string);
    let OldProductDetails = await getProductDetail(SourceProductTableId as unknown as number);
    let OldPrice = OldProductDetails?.summary.latest_price as number;
    let CurrentPriceString = Product?.price ?? Product.variants[0].price;
    let CurrentPrice = Number(CurrentPriceString);
    if(OldPrice != null && OldPrice != CurrentPrice){
      ChangedProducts.push({Title: Product.title, OldPrice: OldPrice, NewPrice: CurrentPrice});
    }
    /*
    console.log("\n\n");
    console.log("Old product price");
    console.log(OldPrice);
    console.log(Product);  
    console.log("\n\n");
    */
  }
  if(ChangedProducts.length != 0){
    console.log("Products Changed");
    
    
    let ProductComponents = ChangedProducts.map(Product => {
      return (<div>
        <p>
          Title: {Product.Title}, OldPrice: {Product.OldPrice}, NewPrice: {Product.NewPrice}
        </p>
      </div>)
    });
    const ResponseComponent = ( 
      <div>
        <h1>
          This is the price changes
        </h1>
      
        {ProductComponents}
      </div>);
    for(let UserId of user_ids as number[]){
      let UserInfo = await findUserById(UserId)
      //console.log("\n\n");
      //console.log(UserInfo?.email);
      //console.log(ResponseComponent);
      const ResponseEmail = await sendNotificationEmail("Price Change Alert", UserInfo?.email as string, ResponseComponent);
      //console.log(ResponseEmail);
    }

  }
    
  const savedRun = await saveScrapeRun({
    userIds: user_ids,
    rawUrl: url,
    products: Array.isArray(result?.products) ? result.products : [],
    resourceType: request.resourceType,
  });

  await insertTrackingRun({
    scrapeRunId: savedRun.scrapeRunId,
    triggerType: "scheduled",
    status: "completed",
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
  });

}
async function scrapeTrackedProduct(target: Awaited<ReturnType<typeof getTrackedProductsForScheduling>>[number]) {
  const request = new ScraperRequest(target.product_url);
  request.resourceType = "product";
  console.log("[scheduled_tracking] scraping tracked product", {
    source_product_id: target.source_product_id,
    product_url: target.product_url,
    tracked_users: target.user_ids.length,
  });
  scrapeTrackedItem(request, target.user_ids, target.product_url);
}

async function scrapeTrackedStore(
  target: Awaited<ReturnType<typeof getTrackedStoresForScheduling>>[number]
) {
  const request = new ScraperRequest(target.store_domain);
  request.resourceType = "store";
   console.log("[scheduled_tracking] scraping tracked store", {
    store_id: target.store_id,
    store_domain: target.store_domain,
    tracked_users: target.user_ids.length,
    
  });
  
  
 scrapeTrackedItem(request, target.user_ids, target.store_domain);
}

export async function runScheduledTrackingSweep() {
  if (globalThis.__trackingSchedulerRunning) {
    return;
  }

  globalThis.__trackingSchedulerRunning = true;
  const startedAt = new Date();

  try {
    const [productTargets, storeTargets] = await Promise.all([
      getTrackedProductsForScheduling(),
      getTrackedStoresForScheduling(),
    ]);

    for (const target of productTargets) {
      if (!target.product_url || target.user_ids.length === 0) {
        continue;
      }

      try {
        await scrapeTrackedProduct(target);
      } catch (error) {
        console.error("[scheduled_tracking] scheduled scrape failed", {
          source_product_id: target.source_product_id,
          product_url: target.product_url,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    for (const target of storeTargets) {
      if (!target.store_domain || target.user_ids.length === 0) {
        continue;
      }

      try {
        await scrapeTrackedStore(target);
      } catch (error) {
        console.error("[scheduled_tracking] scheduled store scrape failed", {
          store_id: target.store_id,
          store_domain: target.store_domain,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } finally {
    globalThis.__trackingSchedulerRunning = false;
    console.log("[scheduled_tracking] sweep complete", {
      duration_ms: Date.now() - startedAt.getTime(),
    });
  }
}

export function initializeScheduledScraping() {
  if (process.env.NODE_ENV === "test") {
    return;
  }

  if (globalThis.__trackingSchedulerInitialized) {
    return;
  }
  console.log("hello");
  cron.schedule(
    "0 1 * * *",
    () => {
      void runScheduledTrackingSweep();
    },
    { timezone: "UTC" }
  );

  globalThis.__trackingSchedulerInitialized = true;
  console.log("[scheduled_tracking] initialized", {
    schedule: "0 1 * * *",
    timezone: "UTC",
  });
}