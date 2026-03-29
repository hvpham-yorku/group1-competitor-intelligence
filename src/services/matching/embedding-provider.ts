type EmbeddingProviderName = "openrouter" | "openai" | "local-test";

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

async function requestOpenAiEmbeddings(texts: string[]): Promise<EmbeddingResponse[]> {
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
      input: texts,
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

  const vectors = payload.data?.map((item) => item.embedding).filter(Array.isArray);
  if (!vectors || vectors.length !== texts.length) {
    throw new Error("OpenAI embeddings response did not include the expected vectors");
  }

  return vectors.map((vector) => ({
    provider: "openai" as const,
    model,
    vector,
  }));
}

async function requestOpenRouterEmbeddings(texts: string[]): Promise<EmbeddingResponse[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const model = process.env.OPENROUTER_EMBEDDING_MODEL || "qwen/qwen3-embedding-8b";
  const response = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      input: texts,
      model,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter embeddings request failed: ${response.status} ${body}`);
  }

  const payload = (await response.json()) as {
    data?: Array<{ embedding?: number[] }>;
  };

  const vectors = payload.data?.map((item) => item.embedding).filter(Array.isArray);
  if (!vectors || vectors.length !== texts.length) {
    throw new Error("OpenRouter embeddings response did not include the expected vectors");
  }

  return vectors.map((vector) => ({
    provider: "openrouter" as const,
    model,
    vector,
  }));
}

export function getConfiguredEmbeddingProvider(): {
  provider: EmbeddingProviderName;
  model: string;
} {
  if (process.env.OPENROUTER_API_KEY) {
    return {
      provider: "openrouter",
      model: process.env.OPENROUTER_EMBEDDING_MODEL || "qwen/qwen3-embedding-8b",
    };
  }

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

export async function generateEmbeddings(
  texts: string[],
  target: { provider: EmbeddingProviderName; model: string } = getConfiguredEmbeddingProvider()
): Promise<EmbeddingResponse[]> {
  const normalized = texts.map((text) => text.trim());
  if (normalized.length === 0 || normalized.some((text) => !text)) {
    throw new Error("Cannot generate embeddings for empty text");
  }

  if (target.provider === "openrouter") {
    return requestOpenRouterEmbeddings(normalized);
  }

  if (target.provider === "openai") {
    return requestOpenAiEmbeddings(normalized);
  }

  return normalized.map((text) => ({
    provider: "local-test" as const,
    model: `deterministic-${LOCAL_TEST_DIMENSIONS}d`,
    vector: buildLocalTestEmbedding(text),
  }));
}

export async function generateEmbedding(text: string): Promise<EmbeddingResponse> {
  const [result] = await generateEmbeddings([text]);
  return result;
}
