import {
  generateEmbedding,
  getConfiguredEmbeddingProvider,
} from "@/services/matching/embedding-provider";

describe("embedding provider", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;
  const originalModel = process.env.OPENAI_EMBEDDING_MODEL;

  afterEach(() => {
    process.env.OPENAI_API_KEY = originalApiKey;
    process.env.OPENAI_EMBEDDING_MODEL = originalModel;
  });

  it("falls back to deterministic local embeddings when no API key is configured", async () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_EMBEDDING_MODEL;

    const provider = getConfiguredEmbeddingProvider();
    expect(provider.provider).toBe("local-test");

    const embedding = await generateEmbedding("Tone vanilla body wash");
    expect(embedding.provider).toBe("local-test");
    expect(embedding.vector.length).toBe(64);
    expect(embedding.model).toContain("deterministic");
  });
});
