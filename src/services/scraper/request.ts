export class ScraperRequest {
    url: string;
    resourceType: 'product' | 'collection' | 'store';
    options: any;

    constructor(url: string, options: any = {}) {
        this.url = this.ensureAbsoluteUrl(url);
        this.resourceType = 'store';
        this.options = options;
    }

    private ensureAbsoluteUrl(url: string): string {
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            return `https://${url}`;
        }
        return url;
    }
}
