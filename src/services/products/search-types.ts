export type ProductSearchResult = {
  source_product_id: number;
  store_domain: string;
  title: string;
  product_url: string;
  images: Array<{
    src?: string;
    alt?: string;
  }>;
  image_url: string | null;
  vendor: string | null;
  product_type: string | null;
  latest_price: number | null;
  latest_available: boolean | null;
  latest_inventory_quantity: number | null;
  latest_observed_at: string | null;
};

export type ProductSearchPage = {
  items: ProductSearchResult[];
  page: number;
  page_size: number;
  total: number;
};
