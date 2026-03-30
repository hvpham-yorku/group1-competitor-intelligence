import { listApprovedMatchedGapRows } from "@/persistence/matching-repository";
import { parseImageUrl } from "@/services/products/observation-utils";
import type {
  MatchedAnalysisDeltaDirection,
  MatchedAnalysisResponse,
  MatchedAnalysisRow,
  MatchedAnalysisSortKey,
  MatchedAnalysisSortOrder,
} from "@/services/matched-analysis/types";

function compareRows(
  left: MatchedAnalysisRow,
  right: MatchedAnalysisRow,
  sortKey: MatchedAnalysisSortKey,
  sortOrder: MatchedAnalysisSortOrder
) {
  const direction = sortOrder === "asc" ? 1 : -1;

  switch (sortKey) {
    case "gap_delta": {
      const leftValue = left.gap_delta ?? Number.NEGATIVE_INFINITY;
      const rightValue = right.gap_delta ?? Number.NEGATIVE_INFINITY;
      if (leftValue !== rightValue) {
        return (leftValue - rightValue) * direction;
      }
      break;
    }
    case "owned_title": {
      return left.owned_title.localeCompare(right.owned_title) * direction;
    }
    case "competitor_title": {
      return left.competitor_title.localeCompare(right.competitor_title) * direction;
    }
    case "absolute_gap":
    default: {
      const leftValue = left.absolute_gap ?? Number.NEGATIVE_INFINITY;
      const rightValue = right.absolute_gap ?? Number.NEGATIVE_INFINITY;
      if (leftValue !== rightValue) {
        return (leftValue - rightValue) * direction;
      }
    }
  }

  return left.owned_title.localeCompare(right.owned_title);
}

export async function getMatchedAnalysis(input: {
  userId: number;
  page?: number;
  pageSize?: number;
  store?: string;
  competitor?: string;
  deltaDirection?: MatchedAnalysisDeltaDirection;
  sortKey?: MatchedAnalysisSortKey;
  sortOrder?: MatchedAnalysisSortOrder;
  query?: string;
}): Promise<MatchedAnalysisResponse> {
  const page = Math.max(1, input.page ?? 1);
  const requestedPageSize = input.pageSize ?? 20;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.min(Math.max(1, requestedPageSize), 5000)
    : 20;
  const store = (input.store ?? "").trim();
  const competitor = (input.competitor ?? "").trim();
  const deltaDirection = input.deltaDirection ?? "all";
  const sortKey = input.sortKey ?? "absolute_gap";
  const sortOrder = input.sortOrder ?? "desc";
  const query = (input.query ?? "").trim().toLowerCase();

  const allRows = (await listApprovedMatchedGapRows({ userId: input.userId }))
    .map<MatchedAnalysisRow>((row) => {
      const gapDelta =
        row.competitor_latest_price != null && row.owned_latest_price != null
          ? row.competitor_latest_price - row.owned_latest_price
          : null;

      return {
        owned_source_product_id: row.owned_source_product_id,
        owned_title: row.owned_title,
        owned_product_url: row.owned_product_url,
        owned_image_url: parseImageUrl(row.owned_images_json),
        owned_vendor: row.owned_vendor,
        owned_product_type: row.owned_product_type,
        owned_store_domain: row.owned_store_domain,
        owned_latest_price: row.owned_latest_price,
        competitor_source_product_id: row.competitor_source_product_id,
        competitor_title: row.competitor_title,
        competitor_product_url: row.competitor_product_url,
        competitor_image_url: parseImageUrl(row.competitor_images_json),
        competitor_vendor: row.competitor_vendor,
        competitor_product_type: row.competitor_product_type,
        competitor_store_domain: row.competitor_store_domain,
        competitor_latest_price: row.competitor_latest_price,
        gap_delta: gapDelta,
        absolute_gap: gapDelta == null ? null : Math.abs(gapDelta),
        score: row.score,
        method: row.method,
        updated_at: row.updated_at,
      };
    });

  const rows = allRows.filter((row) => {
      if (store && row.owned_store_domain !== store) {
        return false;
      }

      if (competitor && row.competitor_store_domain !== competitor) {
        return false;
      }

      if (deltaDirection === "positive" && (row.gap_delta ?? 0) <= 0) {
        return false;
      }

      if (deltaDirection === "negative" && (row.gap_delta ?? 0) >= 0) {
        return false;
      }

      if (
        query &&
        ![
          row.owned_title,
          row.competitor_title,
          row.owned_store_domain,
          row.competitor_store_domain,
          row.owned_vendor ?? "",
          row.competitor_vendor ?? "",
        ].some((value) => value.toLowerCase().includes(query))
      ) {
        return false;
      }
      return true;
    });

  rows.sort((left, right) => compareRows(left, right, sortKey, sortOrder));

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  return {
    rows: rows.slice(startIndex, startIndex + pageSize),
    page: currentPage,
    page_size: pageSize,
    total_rows: totalRows,
    total_pages: totalPages,
    query: input.query?.trim() ?? "",
    store,
    competitor,
    delta_direction: deltaDirection,
    sort_key: sortKey,
    sort_order: sortOrder,
    stores: Array.from(new Set(allRows.map((row) => row.owned_store_domain))).sort((left, right) => left.localeCompare(right)),
    competitors: Array.from(new Set(allRows.map((row) => row.competitor_store_domain))).sort((left, right) => left.localeCompare(right)),
    kpis: {
      approved_matches: totalRows,
      competitors: Array.from(new Set(rows.map((row) => row.competitor_store_domain))).length,
      positive_gaps: rows.filter((row) => (row.gap_delta ?? 0) > 0).length,
      negative_gaps: rows.filter((row) => (row.gap_delta ?? 0) < 0).length,
      neutral_gaps: rows.filter((row) => (row.gap_delta ?? 0) === 0).length,
    },
  };
}
