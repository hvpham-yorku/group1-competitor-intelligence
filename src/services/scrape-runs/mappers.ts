import type {
  NormalizedProduct,
  NormalizedVariant,
} from "@/services/scraper/normalized-types";
import { buildVariantKey } from "./utils";

export type ScrapeObservationRow = {
  source_product_id: number;
  source_variant_id: number;
  created_at: string;
  source_created_at: string | null;
  source_updated_at: string | null;
  store_domain: string;
  store_platform: string | null;
  product_url: string;
  platform_product_id: string | null;
  product_title: string;
  vendor: string | null;
  product_type: string | null;
  handle: string | null;
  description: string | null;
  tags_json: string | null;
  images_json: string | null;
  platform_variant_id: string | null;
  variant_title: string;
  sku: string | null;
  options_json: string | null;
  image_json: string | null;
  variant_product_url: string | null;
  price: number | null;
  compare_at_price: number | null;
  currency: string | null;
  available: number | null;
  inventory_quantity: number | null;
  inventory_policy: string | null;
  title_snapshot: string;
  variant_title_snapshot: string;
  observed_at: string;
};

export type SourceProductRecord = {
  productUrl: string;
  platformProductId: string | null;
  title: string;
  vendor: string | null;
  productType: string | null;
  handle: string | null;
  description: string | null;
  tagsJson: string;
  imagesJson: string;
  sourceCreatedAt: string | null;
  sourceUpdatedAt: string | null;
};

export type SourceVariantRecord = {
  platformVariantId: string;
  variantTitle: string;
  sku: string | null;
  optionsJson: string;
  imageJson: string;
  productUrl: string;
};

export type ObservationRecord = {
  price: number | null;
  compareAtPrice: number | null;
  currency: string | null;
  available: number | null;
  inventoryQuantity: number | null;
  inventoryPolicy: string | null;
  titleSnapshot: string;
  variantTitleSnapshot: string;
  observedAt: string | null;
};

function safeParse<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function formatPrice(value: number | null): string {
  return Number.isFinite(value) ? (value as number).toFixed(2) : "0";
}

function parseMoney(value: string | undefined): number | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function buildSourceProductRecord(
  product: NormalizedProduct
): SourceProductRecord {
  return {
    productUrl: product.product_url,
    platformProductId: product.id == null ? null : String(product.id),
    title: product.title,
    vendor: product.vendor || null,
    productType: product.product_type || null,
    handle: product.handle || null,
    description: product.description || null,
    tagsJson: JSON.stringify(product.tags || []),
    imagesJson: JSON.stringify(product.images || []),
    sourceCreatedAt: product.created_at || null,
    sourceUpdatedAt: product.source_updated_at || null,
  };
}

export function buildSourceVariantRecord(
  product: NormalizedProduct,
  variant: NormalizedVariant,
  index: number
): SourceVariantRecord {
  return {
    platformVariantId: buildVariantKey(variant, index),
    variantTitle: variant.title || product.title,
    sku: variant.sku || null,
    optionsJson: JSON.stringify(variant.options || []),
    imageJson: JSON.stringify(variant.image || null),
    productUrl: variant.product_url || product.product_url,
  };
}

export function buildObservationRecord(
  product: NormalizedProduct,
  variant: NormalizedVariant
): ObservationRecord {
  return {
    price: parseMoney(variant.price),
    compareAtPrice: parseMoney(variant.compare_at_price),
    currency: variant.currency || null,
    available:
      typeof variant.available === "boolean"
        ? variant.available
          ? 1
          : 0
        : null,
    inventoryQuantity: variant.inventory_quantity ?? null,
    inventoryPolicy: variant.inventory_policy || null,
    titleSnapshot: product.title,
    variantTitleSnapshot: variant.title || product.title,
    observedAt: variant.observed_at || product.last_updated_at || null,
  };
}

export function buildProductsFromRows(
  rows: ScrapeObservationRow[]
): NormalizedProduct[] {
  const products = new Map<number, NormalizedProduct>();

  for (const row of rows) {
    let product = products.get(row.source_product_id);

    if (!product) {
      product = {
        source_product_id: row.source_product_id,
        id: row.platform_product_id || row.source_product_id,
        title: row.title_snapshot || row.product_title,
        handle: row.handle || undefined,
        vendor: row.vendor || undefined,
        product_type: row.product_type || undefined,
        description: row.description || undefined,
        tags: safeParse<string[]>(row.tags_json, []),
        product_url: row.product_url,
        images: safeParse<Array<{ src?: string; alt?: string }>>(row.images_json, []),
        platform: row.store_platform || undefined,
        source_url: row.store_domain || undefined,
        created_at: row.source_created_at || undefined,
        source_updated_at: row.source_updated_at || undefined,
        last_updated_at: row.observed_at,
        variants: [],
      };
      products.set(row.source_product_id, product);
    }

    if (
      !product.last_updated_at ||
      new Date(row.observed_at).getTime() > new Date(product.last_updated_at).getTime()
    ) {
      product.last_updated_at = row.observed_at;
    }

    const variant: NormalizedVariant = {
      id: row.platform_variant_id || row.source_variant_id,
      title: row.variant_title_snapshot || row.variant_title,
      sku: row.sku || undefined,
      price: formatPrice(row.price),
      compare_at_price:
        row.compare_at_price == null
          ? undefined
          : formatPrice(row.compare_at_price),
      currency: row.currency || undefined,
      available: row.available == null ? undefined : row.available === 1,
      inventory_quantity:
        row.inventory_quantity == null ? undefined : row.inventory_quantity,
      inventory_policy: row.inventory_policy || undefined,
      options: safeParse<string[]>(row.options_json, []),
      image: safeParse<{ src?: string; alt?: string } | undefined>(
        row.image_json,
        undefined
      ),
      product_url: row.variant_product_url || row.product_url,
      observed_at: row.observed_at,
    };

    product.variants.push(variant);
  }

  return Array.from(products.values());
}
