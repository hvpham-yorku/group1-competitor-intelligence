import { getMatchedAnalysis } from "@/services/matched-analysis/get-matched-analysis";
import { listTrackedProducts } from "@/services/tracking/get-tracked-products";
import { listTrackedStores } from "@/services/tracking/get-tracked-stores";
import type {
  OverviewDateRange,
  OverviewDeltaDirection,
  OverviewPriceChangeRow,
  OverviewResponse,
  OverviewSortKey,
  OverviewSortOrder,
} from "@/services/overview/types";

function resolveDateBounds(input: {
  dateRange: OverviewDateRange;
  startDate?: string;
  endDate?: string;
}) {
  if (input.dateRange === "all" && !input.startDate && !input.endDate) {
    return { start: null, end: null };
  }

  const end = input.endDate ? new Date(input.endDate) : new Date();
  const start = input.startDate ? new Date(input.startDate) : new Date(end);

  if (!input.startDate) {
    switch (input.dateRange) {
      case "24h":
        start.setDate(start.getDate() - 1);
        break;
      case "7d":
        start.setDate(start.getDate() - 7);
        break;
      case "30d":
        start.setDate(start.getDate() - 30);
        break;
      case "90d":
        start.setDate(start.getDate() - 90);
        break;
      case "all":
        return { start: null, end: null };
    }
  }

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { start: null, end: null };
  }

  return { start, end };
}

function compareRows(
  left: OverviewPriceChangeRow,
  right: OverviewPriceChangeRow,
  sortKey: OverviewSortKey,
  sortOrder: OverviewSortOrder
) {
  const direction = sortOrder === "asc" ? 1 : -1;

  if (sortKey === "price_delta") {
    const leftValue = Math.abs(left.price_delta ?? Number.NEGATIVE_INFINITY);
    const rightValue = Math.abs(right.price_delta ?? Number.NEGATIVE_INFINITY);
    if (leftValue !== rightValue) {
      return (leftValue - rightValue) * direction;
    }
  } else {
    const leftValue = new Date(left.latest_seen_at).getTime();
    const rightValue = new Date(right.latest_seen_at).getTime();
    if (leftValue !== rightValue) {
      return (leftValue - rightValue) * direction;
    }
  }

  return left.title.localeCompare(right.title);
}

export async function getOverview(input: {
  userId: number;
  page?: number;
  pageSize?: number;
  store?: string;
  dateRange?: OverviewDateRange;
  startDate?: string;
  endDate?: string;
  deltaDirection?: OverviewDeltaDirection;
  sortKey?: OverviewSortKey;
  sortOrder?: OverviewSortOrder;
  query?: string;
}): Promise<OverviewResponse> {
  const page = Math.max(1, input.page ?? 1);
  const requestedPageSize = input.pageSize ?? 20;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(Math.max(1, requestedPageSize), 5000)
    : 20;
  const store = (input.store ?? "").trim();
  const query = (input.query ?? "").trim().toLowerCase();
  const dateRange = input.dateRange ?? "7d";
  const deltaDirection = input.deltaDirection ?? "all";
  const sortKey = input.sortKey ?? "latest_seen_at";
  const sortOrder = input.sortOrder ?? "desc";

  const [trackedProducts, trackedStores, matchedAnalysis] = await Promise.all([
    listTrackedProducts({ userId: input.userId }),
    listTrackedStores({ userId: input.userId }),
    getMatchedAnalysis({ userId: input.userId, page: 1, pageSize: 5 }),
  ]);

  const { start, end } = resolveDateBounds({
    dateRange,
    startDate: input.startDate,
    endDate: input.endDate,
  });

  const filteredRows = trackedProducts
    .filter((summary) => summary.latest_seen_at && summary.price_delta != null && summary.price_delta !== 0)
    .filter((summary) => {
      if (!summary.latest_seen_at) {
        return false;
      }

      const observedAt = new Date(summary.latest_seen_at);
      if (Number.isNaN(observedAt.getTime())) {
        return false;
      }

      if (start && end && (observedAt < start || observedAt > end)) {
        return false;
      }

      if (store && summary.store_domain !== store) {
        return false;
      }

      if (deltaDirection === "up" && (summary.price_delta ?? 0) <= 0) {
        return false;
      }

      if (deltaDirection === "down" && (summary.price_delta ?? 0) >= 0) {
        return false;
      }

      if (
        query &&
        ![
          summary.title,
          summary.vendor ?? "",
          summary.product_type ?? "",
          summary.store_domain,
        ].some((value) => value.toLowerCase().includes(query))
      ) {
        return false;
      }

      return true;
    })
    .map<OverviewPriceChangeRow>((summary) => ({
      source_product_id: summary.source_product_id,
      title: summary.title,
      product_url: summary.product_url,
      vendor: summary.vendor,
      product_type: summary.product_type,
      store_domain: summary.store_domain,
      image_url: summary.image_url,
      latest_price: summary.latest_price,
      previous_price: summary.previous_price,
      price_delta: summary.price_delta,
      latest_seen_at: summary.latest_seen_at ?? summary.tracked_at,
      latest_scrape_run_id: summary.latest_scrape_run_id,
    }));

  filteredRows.sort((left, right) => compareRows(left, right, sortKey, sortOrder));

  const totalRows = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const rows = filteredRows.slice(startIndex, startIndex + pageSize);

  return {
    rows,
    page: currentPage,
    page_size: pageSize,
    total_rows: totalRows,
    total_pages: totalPages,
    query: input.query?.trim() ?? "",
    store,
    date_range: dateRange,
    delta_direction: deltaDirection,
    sort_key: sortKey,
    sort_order: sortOrder,
    stores: Array.from(new Set(trackedProducts.map((summary) => summary.store_domain))).sort((left, right) =>
      left.localeCompare(right)
    ),
    kpis: {
      tracked_products: trackedProducts.length,
      tracked_competitors: trackedStores.filter((trackedStore) => !trackedStore.is_owned_store).length,
      price_changes: filteredRows.length,
      increases: filteredRows.filter((row) => (row.price_delta ?? 0) > 0).length,
      decreases: filteredRows.filter((row) => (row.price_delta ?? 0) < 0).length,
    },
    matched_preview: matchedAnalysis.rows.slice(0, 5).map((row) => ({
      owned_source_product_id: row.owned_source_product_id,
      owned_title: row.owned_title,
      owned_image_url: row.owned_image_url,
      owned_store_domain: row.owned_store_domain,
      owned_latest_price: row.owned_latest_price,
      competitor_source_product_id: row.competitor_source_product_id,
      competitor_title: row.competitor_title,
      competitor_image_url: row.competitor_image_url,
      competitor_store_domain: row.competitor_store_domain,
      competitor_latest_price: row.competitor_latest_price,
      gap_delta: row.gap_delta,
      absolute_gap: row.absolute_gap,
    })),
  };
}
