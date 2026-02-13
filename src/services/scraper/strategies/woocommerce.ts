import { ScraperStrategy, ProgressCallback } from './interface';
import { ScraperRequest } from '../request';
import { httpClient } from '../clients';

export const WooCommerceStrategy: ScraperStrategy = {
    name: 'WooCommerce',
    description: 'Extracts data from WooCommerce via WP-JSON API',
    match: async (url) => {
        const response = await httpClient.get(url + "/wp-json/wc/store/v1/products");
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
    scrape: async (req: ScraperRequest, onProgress?: ProgressCallback) => {
        onProgress?.({ message: 'Fetching WooCommerce products...' });
        const response = await httpClient.get(req.url + "/wp-json/wc/store/v1/products");
        return response.json();
    }
};
