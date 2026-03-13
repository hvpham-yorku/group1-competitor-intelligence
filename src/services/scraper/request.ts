export class ScraperRequest {
    url: string;
    resourceType: 'product' | 'collection' | 'store';
    options: Record<string, unknown>;

    constructor(url: string, options: Record<string, unknown> = {}) {
        this.url = this.ensureAbsoluteUrl(url);
        this.resourceType = inferResourceType(this.url);
        this.options = options;
    }

    private ensureAbsoluteUrl(url: string): string {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `https://${url}`;
        }
        return url;
    }
}

export function inferResourceType(url: string): 'product' | 'collection' | 'store' {
    try {
        const parsedUrl = new URL(url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`);
        const path = parsedUrl.pathname.toLowerCase().replace(/\/+$/, '');

        if (path.includes('/products/')) {
            return 'product';
        }

        if (path.includes('/collections/')) {
            return 'collection';
        }

        return 'store';
    } catch {
        return 'store';
    }
}
