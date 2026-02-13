import { ScraperRequest } from './request';
import { ScraperStrategy, ShopifyStrategy, UniversalStrategy, WooCommerceStrategy, ProgressCallback } from './strategies/index';

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

    async execute(request: ScraperRequest, onProgress?: ProgressCallback): Promise<any> {
        const errors: string[] = [];

        // Iterate through strategies sequentially and scrape if a match is found
        for (const strategy of this.strategies) {
            try {
                const result = await strategy.match(request.url);
                if (result.isMatch) {
                    console.log(`Using strategy: ${strategy.name}`);
                    return strategy.scrape(request, onProgress);
                }
                if (result.error) {
                    errors.push(`${strategy.name}: ${result.error}`);
                }
            } catch (err: any) {
                errors.push(`${strategy.name}: ${err.message}`);
            }
        }

        // If no match found, analyze errors to provide a better message
        const unreachable = errors.some(e => e.includes('Domain could not be reached'));
        if (unreachable) {
            throw new Error('Domain could not be reached. Please check the URL and your connection.');
        }

        console.error(`No matching strategy found for ${request.url}`, errors);
        throw new Error('This site format is not currently supported or the products could not be found.');
    }
}
