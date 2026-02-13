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
        let allProducts: any[] = [];
        let page = 1;
        let hasMore = true;
        const limit = 250;

        while (hasMore) {
            const url = `${req.url}/products.json?page=${page}&limit=${limit}`;
            const response = await httpClient.get(url);

            if (!response.ok) {
                console.error(`Error fetching Shopify page ${page}: ${response.statusText}`);
                break;
            }

            const data = await response.json();
            const products = data.products || [];

            if (products.length > 0) {
                allProducts = allProducts.concat(products);
                page++;

                // Be respectful of rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                hasMore = false;
            }

            // Safety break for extremely large stores or potential infinite loops
            if (page > 50) { // Cap at 12,500 products for now
                console.warn('Reached maximum page limit (50) for Shopify scraping');
                break;
            }
        }

        return { products: allProducts };
    }
};
