import { ScraperRequest } from './request';
import { ScraperStrategy, ShopifyStrategy, UniversalStrategy, WooCommerceStrategy, ProgressCallback } from './strategies/index';
import { NormalizedScrapeResult } from './normalized-types';

export type ScraperFailureReason = 'blocked' | 'unreachable' | 'unsupported';

export interface ScraperAttemptDiagnostic {
    strategy: string;
    status?: number;
    endpoint?: string;
    error?: string;
}

export interface ScraperFailureAnalysis {
    reason: ScraperFailureReason;
    message: string;
    attempts: ScraperAttemptDiagnostic[];
}

export class ScraperExecutionError extends Error {
    reason: ScraperFailureReason;
    attempts: ScraperAttemptDiagnostic[];

    constructor(analysis: ScraperFailureAnalysis) {
        super(analysis.message);
        this.name = 'ScraperExecutionError';
        this.reason = analysis.reason;
        this.attempts = analysis.attempts;
    }
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown strategy error';
}

function hasText(haystack: string | undefined, pattern: RegExp): boolean {
    return typeof haystack === 'string' && pattern.test(haystack);
}

export function analyzeFailedAttempts(attempts: ScraperAttemptDiagnostic[]): ScraperFailureAnalysis {
    const blocked = attempts.some(
        (attempt) =>
            attempt.status === 403 ||
            attempt.status === 429 ||
            hasText(attempt.error, /forbidden|too many requests|rate limit/i)
    );

    if (blocked) {
        return {
            reason: 'blocked',
            message:
                'The target site blocked automated API access (403/429). Try again later or use a browser-backed fallback for this domain.',
            attempts
        };
    }

    const unreachable = attempts.some(
        (attempt) =>
            attempt.status === 503 || hasText(attempt.error, /domain could not be reached|network|timed out|enotfound/i)
    );

    if (unreachable) {
        return {
            reason: 'unreachable',
            message: 'Domain could not be reached. Please check the URL and your connection.',
            attempts
        };
    }

    return {
        reason: 'unsupported',
        message: 'This site format is not currently supported or the products could not be found.',
        attempts
    };
}

// Singleton manager for scraper engine
export class ScraperEngine {
    private static instance: ScraperEngine;
    private strategies: ScraperStrategy[] = [];

    private constructor() {
        this.strategies = [
            ShopifyStrategy,
            WooCommerceStrategy,
            UniversalStrategy
        ];
    }

    static getInstance(): ScraperEngine {
        if (!ScraperEngine.instance) {
            ScraperEngine.instance = new ScraperEngine();
        }
        return ScraperEngine.instance;
    }

    async execute(request: ScraperRequest, onProgress?: ProgressCallback): Promise<NormalizedScrapeResult> {
        const attempts: ScraperAttemptDiagnostic[] = [];

        // Iterate through strategies sequentially and scrape if a match is found
        for (const strategy of this.strategies) {
            try {
                const result = await strategy.match(request.url);
                if (result.isMatch) {
                    console.log(`Using strategy: ${strategy.name}`);
                    return strategy.scrape(request, onProgress);
                }

                attempts.push({
                    strategy: strategy.name,
                    status: result.status,
                    endpoint: result.endpoint,
                    error: result.error
                });
            } catch (err: unknown) {
                attempts.push({
                    strategy: strategy.name,
                    error: getErrorMessage(err)
                });
            }
        }

        const analysis = analyzeFailedAttempts(attempts);
        console.error(`No matching strategy found for ${request.url}`, analysis);
        throw new ScraperExecutionError(analysis);
    }
}
