import { ScraperRequest } from '../request';
import { NormalizedScrapeResult } from '../normalized-types';


export interface MatchResult {
    isMatch: boolean;
    data?: unknown; // first batch of data saved here if match is found
    error?: string; // Optional error message
    status?: number;
    endpoint?: string;
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
    scrape(request: ScraperRequest, onProgress?: ProgressCallback): Promise<NormalizedScrapeResult>;
}
