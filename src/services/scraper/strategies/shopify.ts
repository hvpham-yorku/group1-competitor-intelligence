import { ScraperStrategy, ProgressCallback } from './interface';
import { ScraperRequest } from '../request';
import { getWithBrowserFallback } from '../clients';
import { NormalizedProduct, NormalizedScrapeResult, NormalizedVariant } from '../normalized-types';
import { asNumber, asRecord, asRecordArray, asString } from '../normalize-utils';

function normalizeShopifyVariant(
    variant: Record<string, unknown>,
    productTitle: string,
    productUrl: string,
    imageSrc?: string
): NormalizedVariant {
    const available = typeof variant.available === 'boolean' ? variant.available : undefined;
    const inventoryQuantity = asNumber(variant.inventory_quantity);
    const inventoryPolicy = asString(variant.inventory_policy);
    const inferredAvailable =
        typeof available === 'boolean'
            ? available
            : typeof inventoryQuantity === 'number'
                ? inventoryQuantity > 0 || inventoryPolicy === 'continue'
                : undefined;

    const optionValues = [variant.option1, variant.option2, variant.option3]
        .map((value) => asString(value).trim())
        .filter(Boolean);

    return {
        id: (variant.id as string | number | undefined),
        title: asString(variant.title, productTitle),
        sku: asString(variant.sku) || undefined,
        price: asString(variant.price, '0'),
        compare_at_price: asString(variant.compare_at_price) || undefined,
        available: inferredAvailable,
        inventory_quantity: inventoryQuantity,
        inventory_policy: inventoryPolicy || undefined,
        options: optionValues.length > 0 ? optionValues : undefined,
        image: imageSrc ? { src: imageSrc } : undefined,
        product_url: productUrl,
        raw: variant
    };
}

function normalizeShopifyProduct(product: Record<string, unknown>, baseUrl: string): NormalizedProduct {
    const handle = asString(product.handle);
    const title = asString(product.title, 'Untitled Product');
    const productUrl = handle ? `${baseUrl}/products/${handle}` : baseUrl;
    const images = asRecordArray(product.images);
    const primaryImage = asString(images[0]?.src) || undefined;
    const variantsRaw = asRecordArray(product.variants);
    const variants = variantsRaw.map((variant) => normalizeShopifyVariant(variant, title, productUrl, primaryImage));

    return {
        id: (product.id as string | number | undefined),
        title,
        handle: handle || undefined,
        vendor: asString(product.vendor) || undefined,
        product_type: asString(product.product_type) || undefined,
        description: asString(product.body_html) || undefined,
        tags: typeof product.tags === 'string'
            ? product.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
            : undefined,
        product_url: productUrl,
        images: images.map((image) => ({
            src: asString(image.src) || undefined,
            alt: asString(image.alt) || undefined
        })),
        platform: 'shopify',
        source_url: baseUrl,
        variants: variants.length > 0
            ? variants
            : [{
                title,
                price: '0',
                product_url: productUrl,
                raw: product
            }],
        raw: product
    };
}

export const ShopifyStrategy: ScraperStrategy = {
    name: 'Shopify',
    description: 'Extracts data from Shopify stores using JSON endpoints',
    match: async (url) => {
        const endpoint = url + "/products.json?limit=250";
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
        let hasMore = true;
        const limit = 250;

        while (hasMore) {
            onProgress?.({
                page,
                count: allProducts.length,
                message: `Fetching products from page ${page}...`
            });
            const url = `${req.url}/products.json?page=${page}&limit=${limit}`;
            const response = await getWithBrowserFallback(url);

            if (!response.ok) {
                console.error(`Error fetching Shopify page ${page}: ${response.statusText}`);
                break;
            }

            const data = asRecord(await response.json());
            const products = asRecordArray(data.products);

            if (products.length > 0) {
                allProducts.push(...products);
                page++;

                // Be respectful of rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            } else {
                hasMore = false;
            }

            // Safety break 
            if (page > 50) {
                console.warn('Reached maximum page limit (50) for Shopify scraping');
                break;
            }
        }

        const normalized = allProducts.map((product) => normalizeShopifyProduct(product, req.url));
        const result: NormalizedScrapeResult = {
            products: normalized,
            platform: 'shopify',
            source_url: req.url,
            total_count: normalized.length,
            raw: {
                fetched_products: allProducts.length
            }
        };

        return result;
    }
};
