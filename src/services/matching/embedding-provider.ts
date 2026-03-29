type EmbeddingProviderName = "openai" | "local-test";

type EmbeddingResponse = {
  provider: EmbeddingProviderName;
  model: string;
  vector: number[];
};

const LOCAL_TEST_DIMENSIONS = 64;

function normalizeVector(values: number[]): number[] {
  const magnitude = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
  if (magnitude === 0) {
    return values;
  }

  return values.map((value) => value / magnitude);
}

function buildLocalTestEmbedding(text: string): number[] {
  const vector = new Array<number>(LOCAL_TEST_DIMENSIONS).fill(0);
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();

  for (let index = 0; index < normalized.length; index += 1) {
    const code = normalized.charCodeAt(index);
    const bucket = code % LOCAL_TEST_DIMENSIONS;
    const neighbor = (bucket + 13) % LOCAL_TEST_DIMENSIONS;
    vector[bucket] += 1;
    vector[neighbor] += (code % 7) / 10;
  }

  return normalizeVector(vector);
}

async function buildOpenAiEmbedding(text: string): Promise<EmbeddingResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: text,
      model,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI embeddings request failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const vector = payload.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("OpenAI embeddings response did not include a vector");
  }

  return {
    provider: "openai",
    model,
    vector,
  };
}

export function getConfiguredEmbeddingProvider(): {
  provider: EmbeddingProviderName;
  model: string;
} {
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    };
  }

  return {
    provider: "local-test",
    model: `deterministic-${LOCAL_TEST_DIMENSIONS}d`,
  };
}

export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("Cannot generate an embedding for empty text");
  }

  if (process.env.OPENAI_API_KEY) {
    return buildOpenAiEmbedding(normalized);
  }

  return {
    provider: "local-test",
    model: `deterministic-${LOCAL_TEST_DIMENSIONS}d`,
    vector: buildLocalTestEmbedding(normalized),
  };
}
