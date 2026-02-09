import { ScraperRequest } from './request';
import { ScraperStrategy, ShopifyStrategy, UniversalStrategy, WooCommerceStrategy } from './strategies';

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
        const strategy = this.strategies.find((strategy) => strategy.match(request.url));
        if (!strategy) {
            throw new Error('No matching strategy found');
        }
        return strategy.scrape(request);
    }
}
