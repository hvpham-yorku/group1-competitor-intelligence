/**
 * HTTP Client wrapper
 */
export const httpClient = {
    get: async (url: string, config?: RequestInit) => {
        console.log(`HTTP GET: ${url}`);
        try {
            const response = await fetch(url, config);
            return response;
        } catch (error: unknown) {
            console.error(`HTTP request failed: ${url}`, error);
            const errorObj =
                error && typeof error === 'object'
                    ? (error as { message?: string; code?: string; name?: string })
                    : {};
            const isNetworkError =
                (errorObj.message || '').includes('fetch') ||
                errorObj.code === 'ENOTFOUND' ||
                errorObj.name === 'TypeError';

            return {
                ok: false,
                status: isNetworkError ? 503 : 500,
                statusText: isNetworkError ? 'Domain could not be reached' : 'Internal Error',
                json: async () => ({}),
                text: async () => ''
            } as Response;
        }
    }
};

/**
 * Compatibility wrapper. Strategies call this, but we currently just use
 * the standard HTTP client path.
 */
export async function getWithBrowserFallback(url: string, config?: RequestInit): Promise<Response> {
    return httpClient.get(url, config);
}

/**
 * Browser Client wrapper
 */
export const browserClient = {
    launch: async () => {
        // TODO: Implement browser launch logic
    },
    getPage: async () => {
        // TODO: Implement page navigation logic
    }
};

/**
 * LLM Client wrapper
 */
export const llmClient = {
    complete: async () => {
        // TODO: Implement LLM based scraping
    }
};
