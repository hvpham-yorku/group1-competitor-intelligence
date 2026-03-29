/**
 * @jest-environment node
 */
import { buildSuggestedMatches } from "@/services/matching/suggestions";
import type { MatchableProduct, ProductMatchRecord } from "@/services/matching/types";

function createProduct(
  sourceProductId: number,
  title: string,
  embedding: number[]
): MatchableProduct & { embedding: number[] } {
  return {
    source_product_id: sourceProductId,
    store_domain: sourceProductId < 100 ? "owned.example" : "competitor.example",
    title,
    product_url: `https://example.com/products/${sourceProductId}`,
    image_url: null,
    vendor: null,
    product_type: null,
    variant_titles: [],
    latest_price: null,
    latest_observed_at: null,
    embedding_provider: "local-test",
    embedding_model: "deterministic-64d",
    embedding_dimensions: embedding.length,
    embedded_at: "2026-03-28T00:00:00.000Z",
    embedding,
  };
}

describe("matching suggestions", () => {
  test("returns ranked suggestions per owned product without threshold gating", async () => {
    const ownedProducts = [
      createProduct(1, "Vanilla Body Wash", [1, 0, 0]),
      createProduct(2, "Eucalyptus Deodorant", [0, 1, 0]),
    ];

    const competitorProducts = [
      createProduct(101, "Vanilla Wash", [0.99, 0.01, 0]),
      createProduct(102, "Fresh Body Wash", [0.8, 0.2, 0]),
      createProduct(103, "Eucalyptus Deo", [0.02, 0.98, 0]),
      createProduct(104, "Irrelevant Product", [0, 0, 1]),
    ];

    const reviewedMatches: ProductMatchRecord[] = [];

    const suggestions = await buildSuggestedMatches({
      ownedProducts,
      competitorProducts,
      reviewedMatches,
      limitPerOwnedProduct: 2,
    });

    const topVanilla = suggestions.find((item) => item.owned_product.source_product_id === 1);
    const topEucalyptus = suggestions.find((item) => item.owned_product.source_product_id === 2);

    expect(topVanilla?.competitor_product.source_product_id).toBe(101);
    expect(topEucalyptus?.competitor_product.source_product_id).toBe(103);
    expect(suggestions.every((item) => item.score > 0)).toBe(true);
  });

  test("excludes reviewed pairs from new suggestions", async () => {
    const ownedProducts = [createProduct(1, "Vanilla Body Wash", [1, 0, 0])];
    const competitorProducts = [
      createProduct(101, "Vanilla Wash", [0.99, 0.01, 0]),
      createProduct(102, "Fresh Body Wash", [0.8, 0.2, 0]),
    ];

    const reviewedMatches: ProductMatchRecord[] = [
      {
        owned_product: ownedProducts[0],
        competitor_product: competitorProducts[0],
        score: 0.99,
        method: "embedding-cosine",
        status: "approved",
        updated_at: "2026-03-28T00:00:00.000Z",
      },
    ];

    const suggestions = await buildSuggestedMatches({
      ownedProducts,
      competitorProducts,
      reviewedMatches,
      limitPerOwnedProduct: 2,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].competitor_product.source_product_id).toBe(102);
  });

  test("ranks plausible near-matches ahead of related but weaker alternatives", async () => {
    const ownedProducts = [
      createProduct(1, "Lift Seamless Shorts", [0.92, 0.08, 0, 0]),
      createProduct(2, "Arrival Oversized Tee", [0.05, 0.95, 0, 0]),
    ];

    const competitorProducts = [
      createProduct(101, "Seamless Training Shorts", [0.89, 0.11, 0, 0]),
      createProduct(102, "Compression Shorts", [0.72, 0.28, 0, 0]),
      createProduct(103, "Oversized Training T Shirt", [0.08, 0.92, 0, 0]),
      createProduct(104, "Fitted Training Tank", [0.22, 0.78, 0, 0]),
    ];

    ownedProducts[0].product_type = "shorts";
    ownedProducts[1].product_type = "t-shirt";
    ownedProducts[0].vendor = "Gymshark";
    ownedProducts[1].vendor = "Gymshark";
    competitorProducts[0].product_type = "shorts";
    competitorProducts[1].product_type = "shorts";
    competitorProducts[2].product_type = "t-shirt";
    competitorProducts[3].product_type = "tank";
    competitorProducts[0].vendor = "Gymshark";
    competitorProducts[1].vendor = "Gymshark";
    competitorProducts[2].vendor = "Gymshark";
    competitorProducts[3].vendor = "Gymshark";

    const suggestions = await buildSuggestedMatches({
      ownedProducts,
      competitorProducts,
      reviewedMatches: [],
      limitPerOwnedProduct: 2,
    });

    const topShorts = suggestions.find((item) => item.owned_product.source_product_id === 1);
    const topTee = suggestions.find((item) => item.owned_product.source_product_id === 2);

    const runnerUpShorts = suggestions.find(
      (item) =>
        item.owned_product.source_product_id === 1 &&
        item.competitor_product.source_product_id === 102
    );
    const runnerUpTee = suggestions.find(
      (item) =>
        item.owned_product.source_product_id === 2 &&
        item.competitor_product.source_product_id === 104
    );

    expect(topShorts?.competitor_product.source_product_id).toBe(101);
    expect(topTee?.competitor_product.source_product_id).toBe(103);
    expect(topShorts?.score ?? 0).toBeGreaterThan(0.45);
    expect((topShorts?.score ?? 0) - (runnerUpShorts?.score ?? 0)).toBeGreaterThan(0.1);
    expect((topTee?.score ?? 0) - (runnerUpTee?.score ?? 0)).toBeGreaterThan(0.08);
  });

  test("keeps clearly unrelated products at low confidence even with moderately close embeddings", async () => {
    const ownedProducts = [createProduct(1, "Vanilla Protein Powder 2lb", [0.91, 0.09, 0, 0])];
    ownedProducts[0].vendor = "Alpha Nutrition";
    ownedProducts[0].product_type = "protein";
    ownedProducts[0].latest_price = 49.99;
    ownedProducts[0].variant_titles = ["2lb"];

    const closeButWrong = createProduct(101, "Training Shorts", [0.86, 0.14, 0, 0]);
    closeButWrong.vendor = "Beta Athletics";
    closeButWrong.product_type = "shorts";
    closeButWrong.latest_price = 28;

    const actualMatch = createProduct(102, "Vanilla Whey Protein 2lb", [0.9, 0.1, 0, 0]);
    actualMatch.vendor = "Alpha Nutrition";
    actualMatch.product_type = "protein";
    actualMatch.latest_price = 52;
    actualMatch.variant_titles = ["2lb"];

    const suggestions = await buildSuggestedMatches({
      ownedProducts,
      competitorProducts: [closeButWrong, actualMatch],
      reviewedMatches: [],
      limitPerOwnedProduct: 2,
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].competitor_product.source_product_id).toBe(102);
    expect(suggestions[0].score).toBeGreaterThan(0.7);
  });
});
