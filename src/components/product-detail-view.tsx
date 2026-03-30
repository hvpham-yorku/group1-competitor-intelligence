"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@mantine/core";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ObservationHistoryPoint, ObservationRecentEvent } from "@/services/products/observation-utils";
import type { MatchedProductSummary } from "@/services/products/utils";

type DetailSummary = {
  title: string;
  product_url: string;
  vendor: string | null;
  store_domain: string;
  store_platform: string | null;
  image_url: string | null;
  latest_price: number | null;
  previous_price: number | null;
  price_delta: number | null;
  latest_seen_at?: string | null;
  schedule_label?: string | null;
};

type DetailRecord = {
  summary: DetailSummary;
  history: ObservationHistoryPoint[];
  recent_events: ObservationRecentEvent[];
  matched_products: MatchedProductSummary[];
  comparison_history: Array<{
    product: MatchedProductSummary;
    history: ObservationHistoryPoint[];
  }>;
};

function formatPrice(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

function formatAxisDate(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

const COMPARISON_COLORS = [
  "#f59e0b",
  "#a78bfa",
  "#34d399",
  "#f472b6",
  "#fb7185",
  "#22d3ee",
];

function formatDelta(value: number | null) {
  return typeof value === "number"
    ? `${value > 0 ? "+" : ""}$${value.toFixed(2)}`
    : "N/A";
}

function PriceHistoryChart({
  points,
  description,
  comparisonHistory,
}: {
  points: ObservationHistoryPoint[];
  description: string;
  comparisonHistory: Array<{
    product: MatchedProductSummary;
    history: ObservationHistoryPoint[];
  }>;
}) {
  const [selectedComparisonIds, setSelectedComparisonIds] = React.useState<number[]>(
    comparisonHistory[0] ? [comparisonHistory[0].product.source_product_id] : []
  );

  React.useEffect(() => {
    setSelectedComparisonIds((current) =>
      current.filter((id) => comparisonHistory.some((entry) => entry.product.source_product_id === id))
    );
  }, [comparisonHistory]);

  const visibleComparisons = comparisonHistory.filter((entry) =>
    selectedComparisonIds.includes(entry.product.source_product_id)
  );

  const chartData = React.useMemo(() => {
    const pointMap = new Map<
      string,
      {
        observed_at: string;
        formattedTime: string;
        formattedDate: string;
        primaryPrice?: number | null;
        [key: string]: string | number | null | undefined;
      }
    >();

    for (const point of points) {
      const existing = pointMap.get(point.observed_at) ?? {
        observed_at: point.observed_at,
        formattedTime: formatAxisDate(point.observed_at),
        formattedDate: formatDate(point.observed_at),
      };
      existing.primaryPrice = point.price;
      pointMap.set(point.observed_at, existing);
    }

    // Merge comparison series onto the same timestamp axis so the chart can overlay
    // approved matches without needing a separate chart per product.
    for (const comparison of visibleComparisons) {
      const key = `match_${comparison.product.source_product_id}`;
      for (const point of comparison.history) {
        const existing = pointMap.get(point.observed_at) ?? {
          observed_at: point.observed_at,
          formattedTime: formatAxisDate(point.observed_at),
          formattedDate: formatDate(point.observed_at),
        };
        existing[key] = point.price;
        pointMap.set(point.observed_at, existing);
      }
    }

    return Array.from(pointMap.values()).sort((left, right) =>
      String(left.observed_at).localeCompare(String(right.observed_at))
    );
  }, [points, visibleComparisons]);

  const primaryHasData = chartData.some((point) => typeof point.primaryPrice === "number");
  const yDomain = React.useMemo<[number | "auto", number | "auto"]>(() => {
    const numericValues: number[] = [];

    for (const point of chartData) {
      if (typeof point.primaryPrice === "number") {
        numericValues.push(point.primaryPrice);
      }

      for (const comparison of visibleComparisons) {
        const key = `match_${comparison.product.source_product_id}`;
        const value = point[key];
        if (typeof value === "number") {
          numericValues.push(value);
        }
      }
    }

    if (numericValues.length === 0) {
      return ["auto", "auto"];
    }

    // Keep the price chart relative to the visible values instead of forcing a zero
    // baseline, which makes small price moves easier to read.
    const minValue = Math.min(...numericValues);
    const maxValue = Math.max(...numericValues);

    if (minValue === maxValue) {
      const padding = Math.max(Math.abs(minValue) * 0.05, 1);
      return [Math.max(0, minValue - padding), maxValue + padding];
    }

    const padding = Math.max((maxValue - minValue) * 0.08, 0.5);
    return [Math.max(0, minValue - padding), maxValue + padding];
  }, [chartData, visibleComparisons]);

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3">
        <h3 className="font-semibold">Price history</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {comparisonHistory.length > 0 ? (
        <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
          {comparisonHistory.map((comparison, index) => {
            const checked = selectedComparisonIds.includes(comparison.product.source_product_id);
            return (
              <label
                key={comparison.product.source_product_id}
                className="flex items-center gap-2 text-sm text-muted-foreground"
              >
                <Checkbox
                  checked={checked}
                  onChange={(event) => {
                    const nextChecked = event.currentTarget.checked;
                    setSelectedComparisonIds((current) =>
                      nextChecked
                        ? [...current, comparison.product.source_product_id]
                        : current.filter((id) => id !== comparison.product.source_product_id)
                    );
                  }}
                  color={COMPARISON_COLORS[index % COMPARISON_COLORS.length]}
                />
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: COMPARISON_COLORS[index % COMPARISON_COLORS.length] }}
                />
                <span className="max-w-[18rem] truncate">{comparison.product.title}</span>
              </label>
            );
          })}
        </div>
      ) : null}
      {!primaryHasData && visibleComparisons.length === 0 ? (
        <div className="flex h-[240px] items-center justify-center text-sm text-muted-foreground">
          No price history yet.
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 20, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis
                dataKey="formattedTime"
                minTickGap={24}
                stroke="rgba(255,255,255,0.4)"
                tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 12 }}
              />
              <YAxis
                domain={yDomain}
                stroke="rgba(255,255,255,0.4)"
                tick={{ fill: "rgba(255,255,255,0.58)", fontSize: 12 }}
                tickFormatter={(value: number) => `$${value.toFixed(0)}`}
                width={56}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#09090b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "12px",
                  color: "#fafafa",
                }}
                cursor={{ stroke: "rgba(96,165,250,0.35)", strokeWidth: 1 }}
                formatter={(value, name) => [
                  formatPrice(typeof value === "number" ? value : Number(value ?? 0)),
                  name === "Main product" ? String(name) : String(name),
                ]}
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload;
                  return point?.formattedDate || "";
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="primaryPrice"
                name="Main product"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={{ r: 4, fill: "#93c5fd", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#dbeafe", stroke: "#60a5fa", strokeWidth: 2 }}
                connectNulls
              />
              {visibleComparisons.map((comparison, index) => (
                <Line
                  key={comparison.product.source_product_id}
                  type="monotone"
                  dataKey={`match_${comparison.product.source_product_id}`}
                  name={comparison.product.title}
                  stroke={COMPARISON_COLORS[index % COMPARISON_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export function ProductDetailView({
  detail,
  backHref,
  backLabel,
  emptyLabel,
  visitLabel,
  chartDescription,
  eventDescription,
  fourthCard,
}: {
  detail: DetailRecord | null;
  backHref: string;
  backLabel: string;
  emptyLabel: string;
  visitLabel: string;
  chartDescription: string;
  eventDescription: string;
  fourthCard: {
    label: string;
    value: string;
  };
}) {
  if (detail === null) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium">{emptyLabel}</p>
        <Link className="text-sm text-muted-foreground underline" href={backHref}>
          {backLabel}
        </Link>
      </div>
    );
  }

  const { summary, history, recent_events: recentEvents } = detail;

  return (
    <div className="flex flex-col gap-6 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <Link className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground" href={backHref}>
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <div className="flex items-start gap-4">
            {summary.image_url ? (
              <Image
                src={summary.image_url}
                alt={summary.title}
                width={80}
                height={80}
                className="h-20 w-20 rounded-xl border border-white/10 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-dashed border-white/10 text-xs text-muted-foreground">
                No image
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{summary.title}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline">{summary.store_domain}</Badge>
                {summary.store_platform && (
                  <Badge variant="outline" className="capitalize">
                    {summary.store_platform}
                  </Badge>
                )}
                {summary.vendor && <Badge variant="secondary">{summary.vendor}</Badge>}
              </div>
            </div>
          </div>
        </div>

        <a
          className="inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-medium hover:bg-white/[0.03]"
          href={summary.product_url}
          rel="noreferrer"
          target="_blank"
        >
          {visitLabel}
          <ArrowUpRight className="h-4 w-4" />
        </a>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Latest price</CardDescription>
            <CardTitle>{formatPrice(summary.latest_price)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Previous price</CardDescription>
            <CardTitle>{formatPrice(summary.previous_price)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Change</CardDescription>
            <CardTitle
              className={
                typeof summary.price_delta !== "number"
                  ? ""
                  : summary.price_delta > 0
                    ? "text-rose-400"
                    : summary.price_delta < 0
                      ? "text-emerald-400"
                      : ""
              }
            >
              {typeof summary.price_delta === "number"
                ? `${summary.price_delta > 0 ? "+" : ""}$${summary.price_delta.toFixed(2)}`
                : "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>{fourthCard.label}</CardDescription>
            <CardTitle>{fourthCard.value}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,4fr)_minmax(280px,1fr)]">
        <div className="space-y-6">
          <PriceHistoryChart
            points={history}
            description={chartDescription}
            comparisonHistory={detail.comparison_history}
          />
          <Card className="border-white/10 bg-white/[0.02]">
            <CardHeader>
              <CardTitle>Matched products</CardTitle>
              <CardDescription>Approved matches associated with this product.</CardDescription>
            </CardHeader>
            <CardContent>
              {detail.matched_products.length === 0 ? (
                <p className="text-sm text-muted-foreground">No matched products yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Matched product</th>
                        <th className="px-3 py-2 font-medium">Competitor</th>
                        <th className="px-3 py-2 font-medium">Price</th>
                        <th className="px-3 py-2 font-medium">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.matched_products.map((product) => (
                        (() => {
                          const relativeDelta =
                            typeof product.latest_price === "number" &&
                            typeof summary.latest_price === "number"
                              ? product.latest_price - summary.latest_price
                              : null;

                          // Delta is shown relative to the current detail page product so
                          // each matched row reads as a direct competitor comparison.
                          return (
                        <tr
                          key={product.source_product_id}
                          className="border-b border-white/10 align-top last:border-b-0"
                        >
                          <td className="px-3 py-3">
                            <Link
                              href={`/products/${product.source_product_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 rounded-md transition hover:bg-white/[0.03]"
                            >
                              {product.image_url ? (
                                <Image
                                  src={product.image_url}
                                  alt={product.title}
                                  width={40}
                                  height={40}
                                  className="h-10 w-10 rounded-md border border-white/10 object-cover"
                                />
                              ) : (
                                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 text-[10px] text-muted-foreground">
                                  N/A
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="truncate font-medium text-white hover:text-blue-200">
                                  {product.title}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {product.vendor || product.product_type || product.store_domain}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-3 py-3">
                            <a
                              href={product.product_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted-foreground hover:text-blue-200 hover:underline"
                            >
                              {product.store_domain}
                            </a>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{formatPrice(product.latest_price)}</td>
                          <td
                            className={
                              typeof relativeDelta !== "number"
                                ? "px-3 py-3 text-muted-foreground"
                                : relativeDelta > 0
                                  ? "px-3 py-3 text-rose-400"
                                  : relativeDelta < 0
                                    ? "px-3 py-3 text-emerald-400"
                                    : "px-3 py-3 text-foreground"
                            }
                          >
                            {formatDelta(relativeDelta)}
                          </td>
                        </tr>
                          );
                        })()
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardTitle>Recent scrape events</CardTitle>
            <CardDescription>{eventDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No scrape events yet.</p>
            ) : (
              recentEvents.map((event) => (
                <div
                  key={event.scrape_run_id}
                  className="rounded-lg border border-white/10 bg-black/20 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">Run #{event.scrape_run_id}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(event.observed_at)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    <div>
                      Price: <span className="text-foreground">{formatPrice(event.price)}</span>
                    </div>
                    <div>
                      Variants in stock:{" "}
                      <span className="text-foreground">
                        {event.available_variants}/{event.total_variants}
                      </span>
                    </div>
                    <div>
                      Delta:{" "}
                      <span
                        className={
                          typeof event.price_delta !== "number"
                            ? "text-muted-foreground"
                            : event.price_delta > 0
                              ? "text-rose-400"
                              : event.price_delta < 0
                                ? "text-emerald-400"
                                : "text-foreground"
                        }
                      >
                        {typeof event.price_delta === "number"
                          ? `${event.price_delta > 0 ? "+" : ""}$${event.price_delta.toFixed(2)}`
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ProductDetailLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      {label}
    </div>
  );
}
