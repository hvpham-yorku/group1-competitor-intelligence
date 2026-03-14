/**
 * @jest-environment node
 */
import {
  DEFAULT_WOO_SPIKE_CONFIG,
  runWooCommercePaginationSpike,
} from "@/app/technical-spikes/woocomm-test";

describe("woocommerce spike", () => {
  test(
    "should fetch paginated WooCommerce products and normalize preview records",
    async () => {
      const result = await runWooCommercePaginationSpike(DEFAULT_WOO_SPIKE_CONFIG);

      expect(result.probes.length).toBeGreaterThan(0);
      expect(result.probes[0].status).toBe(200);
      expect(result.probes[0].count).toBeGreaterThan(0);
      expect(result.totalFetched).toBeGreaterThan(0);

      expect(result.normalizedPreview.length).toBeGreaterThan(0);
      const sample = result.normalizedPreview[0];
      expect(typeof sample.id).toBe("number");
      expect(typeof sample.title).toBe("string");
      expect(typeof sample.inStock).toBe("boolean");
      expect(typeof sample.productUrl).toBe("string");
    },
    60000
  );
});
