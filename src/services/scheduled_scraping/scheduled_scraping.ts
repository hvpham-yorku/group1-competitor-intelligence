import { getTrackedProducts, tracked_products } from "@/persistence/tracked-products-repository";
import { ScraperEngine } from "../scraper/engine";
import { ScraperRequest } from "../scraper/request";
import { ScrapeProgress } from "../scraper/strategies";
import { runInTransaction, findOrCreateStore, createScrapeRun, linkUserToScrapeRun, upsertSourceProduct, upsertSourceVariant, insertObservation } from "@/persistence/scrapes-repository";
import { buildSourceProductRecord, buildSourceVariantRecord, buildObservationRecord } from "../scrape-runs/mappers";
import { normalizeUrl, inferPlatform, getVariants } from "../scrape-runs/utils";
import { NormalizedProduct } from "../scraper/normalized-types";
import { insertTrackingRun } from "@/persistence/tracking-runs-repository";
import { url } from "inspector";

const cron = require('node-cron');

// Run every minute
cron.schedule('*/10 * * * * *', async () => {
    console.log('Running task every 10 seconds:', new Date().toISOString());
    let TrackedProducts : tracked_products[] =  (await getTrackedProducts());
    //console.log({TrackedProducts});
    let Products  : NormalizedProduct[] = [];
    //let ProductIds : tracked_products[] = [];
    for(const Value of TrackedProducts){        
        const engine = ScraperEngine.getInstance();
        const ScrapeRequest = new ScraperRequest(Value.product_url);
        ScrapeRequest.resourceType = "product";
        const result = await engine.execute(
        ScrapeRequest,
        (progress: ScrapeProgress) => {     
        }
        );
        const TempProductsIds = Array.isArray(result?.products) ? result.products : [];
        let ProductInformaton = TempProductsIds[0];
        //console.log(ProductInformaton);
        Products.push(ProductInformaton);
        //console.log(Products.length);
    };


    let persistedProducts = 0;
    let persistedVariants = 0;

    await runInTransaction(async () => {
    const scrapeRunId = await createScrapeRun();

    //console.log(scrapeRunId);
    //console.log(Products.length);
    
    for (let ProductIndex = 0; ProductIndex < Products.length; ProductIndex++) {
        let product = Products[ProductIndex];
        let ProductId = TrackedProducts[ProductIndex];
        if (!product || typeof product.product_url !== "string" || !product.title) {
        continue;
        }

        persistedProducts++;
        const sourceProductId = await upsertSourceProduct(
        ProductId.store_id,
        buildSourceProductRecord(product)
        );

        for (const [index, variant] of getVariants(product).entries()) {
        persistedVariants++;
        const sourceVariantId = await upsertSourceVariant(
            sourceProductId,
            buildSourceVariantRecord(product, variant, index)
        );

        await insertObservation({
            scrapeRunId,
            sourceVariantId,
            observation: buildObservationRecord(product, variant),
        });
        }
    }
    insertTrackingRun({scrapeRunId});
    });

});