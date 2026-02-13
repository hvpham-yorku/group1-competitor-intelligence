import { ScraperRequest } from '../request';


export interface MatchResult {
    isMatch: boolean;
    data?: any; // first batch of data saved here if match is found
    error?: string; // Optional error message
}

export interface ScrapeProgress {
    page?: number;
    count?: number;
    message?: string;
}

export type ProgressCallback = (progress: ScrapeProgress) => void;

export interface ScraperStrategy {
    name: string;
    description?: string;
    match(url: string): Promise<MatchResult>;
    scrape(request: ScraperRequest, onProgress?: ProgressCallback): Promise<any>;
}
