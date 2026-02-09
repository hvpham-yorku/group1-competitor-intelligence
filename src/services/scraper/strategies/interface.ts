import { ScraperRequest } from '../request';


export interface MatchResult {
    isMatch: boolean;
    data?: any; // data saved here if match is found
}

export interface ScraperStrategy {
    name: string;
    description?: string;
    match(url: string): Promise<MatchResult>;
    scrape(request: ScraperRequest): Promise<any>;
}
