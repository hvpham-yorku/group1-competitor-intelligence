import type {
  NormalizedProduct,
  NormalizedVariant,
} from "@/services/scraper/normalized-types";

export function normalizeUrl(input: string) {
  const trimmed = (input || "").trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.replace(/^https?:\/\//i, "").replace(/\/+$/, "").toLowerCase();
}

export function safeJsonParse<E>(s: string, backup: E): E {
  try {
    return JSON.parse(s) as E;
  } catch {
    return backup;
  }
}

export function inferPlatform(products: NormalizedProduct[]): string {
  const first = products[0];
  if (!first) {
    return "unknown";
  }

  return typeof first.platform === "string" && first.platform.trim()
    ? first.platform.trim()
    : "unknown";
}

export function buildVariantKey(
  variant: NormalizedVariant,
  index: number
): string {
  if (variant.id != null) {
    return String(variant.id);
  }

  const options = Array.isArray(variant.options)
    ? variant.options.join("|")
    : "";
  const title = variant.title || "Default";
  return `synthetic:${index}:${title}:${options}`;
}

export function getVariants(product: NormalizedProduct): NormalizedVariant[] {
  if (product.variants.length > 0) {
    return product.variants;
  }

  return [
    {
      title: product.title,
      price: product.price || "0",
      compare_at_price: product.compare_at_price,
      currency: product.currency,
      available: product.available,
      inventory_quantity: product.inventory_quantity,
      inventory_policy: product.inventory_policy,
      product_url: product.product_url,
    },
  ];
}
