function cleanString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeTrackedProductInput(input: {
  title?: unknown;
  platform?: unknown;
  product_url?: unknown;
}): {
  title: string;
  shop: string;
  url: string;
} {
  const title = cleanString(input.title);
  const shop = cleanString(input.platform) || "unknown";
  const url = cleanString(input.product_url);

  if (!title || !url) {
    throw new Error("Missing tracked product fields");
  }

  return {
    title,
    shop,
    url,
  };
}
