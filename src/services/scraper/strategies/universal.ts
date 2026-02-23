import { ScraperStrategy } from './interface';
import { ScraperRequest } from '../request';

export const UniversalStrategy: ScraperStrategy = {
    name: 'Universal',
    description: 'Uses LLM + Browser to extract data from any site',
    match: async () => {
        return {
            isMatch: false,
            data: {}
        };
    },
    scrape: async (req: ScraperRequest) => {
        console.log('Universal strategy', req);
        return {
            products: [],
            platform: 'universal',
            source_url: req.url
        };
    }
};
