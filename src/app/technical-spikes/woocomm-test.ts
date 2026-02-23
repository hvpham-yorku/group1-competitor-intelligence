export type WooPageProbe = {
  page: number;
  endpoint: string;
  ok: boolean;
  status: number;
  count: number;
  total: number | null;
  totalPages: number | null;
  durationMs: number;
  error?: string;
};

export type NormalizedSpikeProduct = {
  id: number;
  title: string;
  price: string | null;
  inStock: boolean;
  productUrl: string;
  image: string | null;
};

type WooStoreProduct = {
  id?: number;
  name?: string;
  permalink?: string;
  is_in_stock?: boolean;
  images?: Array<{ src?: string }>;
  prices?: {
    price?: string | number;
    currency_minor_unit?: string | number;
  };
};

export type WooSpikeConfig = {
  baseUrl: string;
  apiPath: string;
  perPage: number;
  maxPagesToTest: number;
};

export type WooSpikeRun = {
  config: WooSpikeConfig;
  probes: WooPageProbe[];
  normalizedPreview: NormalizedSpikeProduct[];
  totalFetched: number;
};

export const DEFAULT_WOO_SPIKE_CONFIG: WooSpikeConfig = {
  baseUrl: "https://sarugbyshop.co.za",
  apiPath: "/wp-json/wc/store/v1/products",
  perPage: 20,
  maxPagesToTest: 5,
};

function buildWooProductsUrl(config: WooSpikeConfig, page: number): string {
  const url = new URL(config.apiPath, config.baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", String(config.perPage));
  return url.toString();
}

function normalizeWooProduct(product: WooStoreProduct): NormalizedSpikeProduct {
  const minorUnit = Number(product?.prices?.currency_minor_unit ?? 2);
  const rawPrice = product?.prices?.price;
  const parsedPrice = Number(rawPrice);
  const normalizedPrice =
    Number.isFinite(parsedPrice) && parsedPrice >= 0
      ? (parsedPrice / Math.pow(10, minorUnit)).toFixed(minorUnit)
      : null;

  return {
    id: Number(product?.id ?? 0),
    title: String(product?.name ?? "Untitled Product"),
    price: normalizedPrice,
    inStock: Boolean(product?.is_in_stock),
    productUrl: String(product?.permalink ?? ""),
    image: product?.images?.[0]?.src ?? null,
  };
}

async function fetchWooPage(
  config: WooSpikeConfig,
  page: number
): Promise<{ probe: WooPageProbe; products: WooStoreProduct[] }> {
  const endpoint = buildWooProductsUrl(config, page);
  const startedAt = Date.now();

  try {
    const response = await fetch(endpoint, { cache: "no-store" });
    const durationMs = Date.now() - startedAt;
    const payload: unknown = await response.json();
    const products: WooStoreProduct[] = Array.isArray(payload) ? (payload as WooStoreProduct[]) : [];

    return {
      probe: {
        page,
        endpoint,
        ok: response.ok,
        status: response.status,
        count: products.length,
        total: Number(response.headers.get("x-wp-total")) || null,
        totalPages: Number(response.headers.get("x-wp-totalpages")) || null,
        durationMs,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      },
      products,
    };
  } catch (error: unknown) {
    return {
      probe: {
        page,
        endpoint,
        ok: false,
        status: 0,
        count: 0,
        total: null,
        totalPages: null,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown fetch error",
      },
      products: [],
    };
  }
}

export async function runWooCommercePaginationSpike(
  config: WooSpikeConfig = DEFAULT_WOO_SPIKE_CONFIG
): Promise<WooSpikeRun> {
  const probes: WooPageProbe[] = [];
  const normalizedPreview: NormalizedSpikeProduct[] = [];

  const firstPageResult = await fetchWooPage(config, 1);
  probes.push(firstPageResult.probe);
  normalizedPreview.push(...firstPageResult.products.slice(0, 5).map(normalizeWooProduct));

  const discoveredPages = firstPageResult.probe.totalPages ?? 1;
  const pagesToTest = Math.min(config.maxPagesToTest, Math.max(1, discoveredPages));

  for (let page = 2; page <= pagesToTest; page++) {
    const current = await fetchWooPage(config, page);
    probes.push(current.probe);
  }

  return {
    config,
    probes,
    normalizedPreview,
    totalFetched: probes.reduce((sum, page) => sum + page.count, 0),
  };
}
