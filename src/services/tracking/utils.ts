function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTrackedProductInput(input: {
  product_url?: unknown;
}): {
  url: string;
} {
  const url = cleanString(input.product_url);

  if (!url) {
    throw new Error("Missing tracked product fields");
  }

  return {
    url,
  };
}
