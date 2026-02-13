import { ScraperStrategy, ProgressCallback } from './interface';
import { ScraperRequest } from '../request';

export const UniversalStrategy: ScraperStrategy = {
    name: 'Universal',
    description: 'Uses LLM + Browser to extract data from any site',
    match: async (url) => {
        return {
            isMatch: false,
            data: {}
        };
    },
    scrape: async (req: ScraperRequest, onProgress?: ProgressCallback) => {
        console.log('Universal strategy', req);
        return {};
    }
};
