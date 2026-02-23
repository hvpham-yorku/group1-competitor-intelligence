import { ScraperStrategy, ProgressCallback } from './interface';
import { ScraperRequest } from '../request';
import { getWithBrowserFallback } from '../clients';
import { NormalizedProduct, NormalizedScrapeResult } from '../normalized-types';
import { asBoolean, asNumber, asRecord, asRecordArray, asString } from '../normalize-utils';

function normalizeWooMoney(value: string | number | undefined, minorUnit: number): string | undefined {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        return undefined;
    }
    return (numeric / Math.pow(10, minorUnit)).toFixed(minorUnit);
}

function normalizeWooProduct(product: Record<string, unknown>, sourceUrl: string): NormalizedProduct {
    const prices = asRecord(product.prices);
    const minorUnit = Number(prices.currency_minor_unit ?? 2);
    const slug = asString(product.slug);
    const title = asString(product.name, 'Untitled Product');
    const productUrl = asString(product.permalink) || `${sourceUrl}/product/${slug}`;
    const images = asRecordArray(product.images);

    return {
        id: (product.id as string | number | undefined),
        title,
        handle: slug || undefined,
        product_type: asString(product.type) || undefined,
        product_url: productUrl,
        images: images.map((image) => ({
            src: asString(image.src) || undefined,
            alt: asString(image.alt) || undefined
        })),
        platform: 'woocommerce',
        source_url: sourceUrl,
        variants: [
            {
                id: (product.id as string | number | undefined),
                title,
                price: normalizeWooMoney(prices.price as string | number | undefined, minorUnit) || '0',
                compare_at_price: normalizeWooMoney(prices.regular_price as string | number | undefined, minorUnit),
                currency: asString(prices.currency_code) || undefined,
                available: asBoolean(product.is_in_stock),
                inventory_quantity: asNumber(product.stock_quantity),
                image: images[0] ? { src: asString(images[0].src) || undefined, alt: asString(images[0].alt) || undefined } : undefined,
                product_url: productUrl,
                raw: prices
            }
        ],
        raw: product
    };
}

export const WooCommerceStrategy: ScraperStrategy = {
    name: 'WooCommerce',
    description: 'Extracts data from WooCommerce via WP-JSON API',
    match: async (url) => {
        const endpoint = url + "/wp-json/wc/store/v1/products";
        const response = await getWithBrowserFallback(endpoint);
        if (response.ok) {
            return {
                isMatch: true,
                data: await response.json(),
                status: response.status,
                endpoint
            };
        }
        return {
            isMatch: false,
            error: response.status === 404 ? 'Resource not found' : response.statusText,
            data: {},
            status: response.status,
            endpoint
        };
    },
    scrape: async (req: ScraperRequest, onProgress?: ProgressCallback) => {
        const allProducts: Record<string, unknown>[] = [];
        let page = 1;
        let totalPages = 1;
        const perPage = 100;

        while (page <= totalPages) {
            onProgress?.({
                page,
                count: allProducts.length,
                message: `Fetching WooCommerce products page ${page}...`
            });

            const response = await getWithBrowserFallback(
                `${req.url}/wp-json/wc/store/v1/products?page=${page}&per_page=${perPage}`
            );

            if (!response.ok) {
                console.error(`Error fetching WooCommerce page ${page}: ${response.statusText}`);
                break;
            }

            const data: unknown = await response.json();
            const products = asRecordArray(data);
            allProducts.push(...products);

            const headerTotalPages = Number(response.headers.get('x-wp-totalpages'));
            if (Number.isFinite(headerTotalPages) && headerTotalPages > 0) {
                totalPages = headerTotalPages;
            }

            if (products.length === 0) {
                break;
            }

            page++;
            if (page > 50) {
                console.warn('Reached maximum page limit (50) for WooCommerce scraping');
                break;
            }
        }

        const normalized = allProducts.map((product) => normalizeWooProduct(product, req.url));
        const result: NormalizedScrapeResult = {
            products: normalized,
            platform: 'woocommerce',
            source_url: req.url,
            total_count: normalized.length,
            raw: {
                fetched_products: allProducts.length
            }
        };

        return result;
    }
};
