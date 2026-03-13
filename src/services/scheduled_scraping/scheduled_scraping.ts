import { SqliteDB } from "@/persistence/database";
import { getTrackedProducts, tracked_products } from "@/persistence/tracked-products-repository";
import { ScraperEngine } from "../scraper/engine";
import { ScraperRequest } from "../scraper/request";
import { ScrapeProgress } from "../scraper/strategies";

const cron = require('node-cron');

// Run every minute
cron.schedule('*/10 * * * * *', async () => {
    console.log('Running task every minute:', new Date().toISOString());
    let TrackedProducts : tracked_products[] =  (await getTrackedProducts());
    console.log({TrackedProducts});
    TrackedProducts.forEach(async (Value: tracked_products)=>{
        const engine = ScraperEngine.getInstance();
        const ScrapeRequest = new ScraperRequest(Value.url);
        ScrapeRequest.resourceType = "product";
        const result = await engine.execute(
        ScrapeRequest,
        (progress: ScrapeProgress) => {     
        }
        );
        const Products = Array.isArray(result?.products) ? result.products : [];
        let ProductInformaton = Products[0];
        console.log(ProductInformaton);
    }
);
});