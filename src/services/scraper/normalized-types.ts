export interface NormalizedVariant {
  id?: string | number;
  title: string;
  sku?: string;
  price: string;
  compare_at_price?: string;
  currency?: string;
  available?: boolean;
  inventory_quantity?: number;
  inventory_policy?: string;
  options?: string[];
  image?: {
    src?: string;
    alt?: string;
  };
  product_url?: string;
  observed_at?: string;
  raw?: unknown;
}

export interface NormalizedProduct {
  id?: string | number;
  title: string;
  handle?: string;
  vendor?: string;
  product_type?: string;
  description?: string;
  tags?: string[];
  product_url: string;
  price?: string;
  compare_at_price?: string;
  currency?: string;
  available?: boolean;
  inventory_quantity?: number;
  inventory_policy?: string;
  images?: Array<{
    src?: string;
    alt?: string;
  }>;
  platform?: "shopify" | "woocommerce" | "universal" | string;
  source_url?: string;
  created_at?: string;
  source_updated_at?: string;
  last_updated_at?: string;
  variants: NormalizedVariant[];
  raw?: unknown;
}

export interface NormalizedScrapeResult {
  products: NormalizedProduct[];
  platform?: "shopify" | "woocommerce" | "universal" | string;
  source_url?: string;
  total_count?: number;
  raw?: unknown;
}
