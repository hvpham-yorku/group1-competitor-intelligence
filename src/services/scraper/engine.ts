import { ScraperRequest } from './request';
import { ScraperStrategy, ShopifyStrategy, UniversalStrategy, WooCommerceStrategy } from './strategies/index';

// Singleton manager for scraper engine
export class ScraperEngine {
    private static instance: ScraperEngine;
    private strategies: ScraperStrategy[] = [];

    private constructor() {
        this.strategies = [
            ShopifyStrategy,
            WooCommerceStrategy,
            UniversalStrategy
        ];
    }

    static getInstance(): ScraperEngine {
        if (!ScraperEngine.instance) {
            ScraperEngine.instance = new ScraperEngine();
        }
        return ScraperEngine.instance;
    }

    async execute(request: ScraperRequest): Promise<any> {
        // Iterate through strategies sequentially and scrape if a match is found
        for (const strategy of this.strategies) {
            const result = await strategy.match(request.url);
            if (result.isMatch) {
                console.log(`Using strategy: ${strategy.name}`);
                return strategy.scrape(request);
            }
        }

        console.error(`No matching strategy found for ${request.url}`);
        throw new Error('No matching strategy found');
    }
}
