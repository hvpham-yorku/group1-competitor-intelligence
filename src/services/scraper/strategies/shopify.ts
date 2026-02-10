import { ScraperStrategy } from './interface';
import { ScraperRequest } from '../request';
import { httpClient } from '../clients';

export const ShopifyStrategy: ScraperStrategy = {
    name: 'Shopify',
    description: 'Extracts data from Shopify stores using JSON endpoints',
    match: async (url) => {
        const response = await httpClient.get(url + "/products.json");
        if (response.ok) {
            return {
                isMatch: true,
                data: await response.json()
            };
        }
        return {
            isMatch: false,
            error: response.status === 404 ? 'Resource not found' : response.statusText,
            data: {}
        };
    },
    scrape: async (req: ScraperRequest) => {
        const response = await httpClient.get(req.url + "/products.json");
        return response.json();
    }
};
