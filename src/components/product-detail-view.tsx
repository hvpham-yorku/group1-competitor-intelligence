"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ObservationHistoryPoint, ObservationRecentEvent } from "@/services/products/observation-utils";

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

function PriceHistoryChart({
  points,
  description,
}: {
  points: ObservationHistoryPoint[];
  description: string;
}) {
  const chartData = points
    .filter((point) => typeof point.price === "number")
    .map((point) => ({
      ...point,
      formattedTime: formatAxisDate(point.observed_at),
      formattedDate: formatDate(point.observed_at),
    }));

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <div className="mb-3">
        <h3 className="font-semibold">Price history</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {chartData.length === 0 ? (
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
                formatter={(value: number) => [formatPrice(value), "Price"]}
                labelFormatter={(_, payload) => {
                  const point = payload?.[0]?.payload;
                  return point?.formattedDate || "";
                }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#60a5fa"
                strokeWidth={3}
                dot={{ r: 4, fill: "#93c5fd", strokeWidth: 0 }}
                activeDot={{ r: 6, fill: "#dbeafe", stroke: "#60a5fa", strokeWidth: 2 }}
              />
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
          <PriceHistoryChart points={history} description={chartDescription} />
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
