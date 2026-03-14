import { analyzeFailedAttempts, type ScraperAttemptDiagnostic } from "@/services/scraper/engine";

describe("scraper engine diagnostics", () => {
  test("classifies 403/429 as blocked", () => {
    const attempts: ScraperAttemptDiagnostic[] = [
      {
        strategy: "Shopify",
        status: 404,
        endpoint: "https://example.com/products.json?limit=250",
        error: "Resource not found",
      },
      {
        strategy: "WooCommerce",
        status: 403,
        endpoint: "https://example.com/wp-json/wc/store/v1/products",
        error: "Forbidden",
      },
    ];

    const analysis = analyzeFailedAttempts(attempts);
    expect(analysis.reason).toBe("blocked");
    expect(analysis.message).toMatch(/blocked/i);
    expect(analysis.attempts).toHaveLength(2);
  });

  test("classifies network/unreachable as unreachable", () => {
    const attempts: ScraperAttemptDiagnostic[] = [
      {
        strategy: "Shopify",
        status: 503,
        error: "Domain could not be reached",
      },
      {
        strategy: "WooCommerce",
        error: "network timeout",
      },
    ];

    const analysis = analyzeFailedAttempts(attempts);
    expect(analysis.reason).toBe("unreachable");
    expect(analysis.message).toMatch(/could not be reached/i);
  });

  test("classifies non-match as unsupported", () => {
    const attempts: ScraperAttemptDiagnostic[] = [
      { strategy: "Shopify", status: 404, error: "Resource not found" },
      { strategy: "WooCommerce", status: 404, error: "Resource not found" },
    ];

    const analysis = analyzeFailedAttempts(attempts);
    expect(analysis.reason).toBe("unsupported");
    expect(analysis.message).toMatch(/not currently supported/i);
  });
});
