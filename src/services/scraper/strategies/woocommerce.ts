import { ScraperStrategy } from './interface';
import { ScraperRequest } from '../request';
import { httpClient } from '../clients';

export const WooCommerceStrategy: ScraperStrategy = {
    name: 'WooCommerce',
    description: 'Extracts data from WooCommerce via WP-JSON API',
    match: async (url) => {
        const response = await httpClient.get(url + "/wp-json/wc/v3/products");
        if (response.ok) {
            return {
                isMatch: true,
                data: await response.json()
            };
        }
        return {
            isMatch: false,
            data: {}
        };
    },
    scrape: async (req: ScraperRequest) => {
        const response = await httpClient.get(req.url + "/wp-json/wc/v3/products");
        return response.json();
    }
};
