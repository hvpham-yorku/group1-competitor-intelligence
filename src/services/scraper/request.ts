export class ScraperRequest {
    url: string;
    resourceType: 'product' | 'collection' | 'store';

    constructor(url: string) {
        this.url = url;
        this.resourceType = 'store';
    }
}
