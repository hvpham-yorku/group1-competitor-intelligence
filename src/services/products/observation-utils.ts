export type ObservationHistoryRow = {
  scrape_run_id: number | null;
  source_variant_id: number | null;
  price: number | null;
  compare_at_price: number | null;
  available: number | null;
  observed_at: string | null;
};

export type ObservationHistoryPoint = {
  scrape_run_id: number;
  observed_at: string;
  price: number | null;
  compare_at_price: number | null;
  available_variants: number;
  total_variants: number;
};

export type ObservationRecentEvent = ObservationHistoryPoint & {
  price_delta: number | null;
};

export function parseImageUrl(imagesJson: string | null): string | null {
  if (!imagesJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(imagesJson) as Array<{ src?: string }>;
    const first = Array.isArray(parsed) ? parsed[0] : null;
    return typeof first?.src === "string" ? first.src : null;
  } catch {
    return null;
  }
}

function summarizeSnapshot(rows: ObservationHistoryRow[]) {
  const numericPrices = rows
    .map((row) => row.price)
    .filter((value): value is number => typeof value === "number");
  const numericComparePrices = rows
    .map((row) => row.compare_at_price)
    .filter((value): value is number => typeof value === "number");
  const availabilityRows = rows.filter(
    (row) => row.source_variant_id != null || row.scrape_run_id != null
  );

  return {
    price: numericPrices.length > 0 ? Math.min(...numericPrices) : null,
    compareAtPrice:
      numericComparePrices.length > 0 ? Math.min(...numericComparePrices) : null,
    availableVariants: rows.filter((row) => row.available === 1).length,
    totalVariants: availabilityRows.length,
  };
}

export function buildObservationHistory<T extends ObservationHistoryRow>(
  rows: T[]
): ObservationHistoryPoint[] {
  const snapshots = new Map<number, T[]>();

  // Group rows by scrape run first so variant-level observations collapse into one
  // snapshot per run before the UI renders history or deltas.
  for (const row of rows) {
    if (!row.scrape_run_id || !row.observed_at) {
      continue;
    }

    const existing = snapshots.get(row.scrape_run_id) || [];
    existing.push(row);
    snapshots.set(row.scrape_run_id, existing);
  }

  return Array.from(snapshots.entries())
    .map(([scrapeRunId, snapshotRows]) => {
      const summary = summarizeSnapshot(snapshotRows);
      const observedAt =
        snapshotRows
          .map((row) => row.observed_at)
          .filter((value): value is string => typeof value === "string")
          .sort()
          .at(-1) || "";

      return {
        scrape_run_id: scrapeRunId,
        observed_at: observedAt,
        price: summary.price,
        compare_at_price: summary.compareAtPrice,
        available_variants: summary.availableVariants,
        total_variants: summary.totalVariants,
      };
    })
    .sort((left, right) => right.observed_at.localeCompare(left.observed_at));
}

export function buildRecentEvents(
  history: ObservationHistoryPoint[],
  limit: number
): ObservationRecentEvent[] {
  // Recent events compare each snapshot to the next older one in the already-sorted
  // history array, which keeps delta calculation consistent across details and tracking.
  return history.slice(0, limit).map((point, index) => {
    const previous = history[index + 1];
    return {
      ...point,
      price_delta:
        point.price != null && previous?.price != null
          ? point.price - previous.price
          : null,
    };
  });
}
