"use client";

import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import {
  ArrowUpRight,
  Loader2,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Select } from "@mantine/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type TrackedProductSummary = {
  tracked_id: number;
  source_product_id: number;
  title: string;
  product_url: string;
  vendor: string | null;
  product_type: string | null;
  store_domain: string;
  store_platform: string | null;
  image_url: string | null;
  tracked_at: string;
  schedule_label: string;
  latest_price: number | null;
  previous_price: number | null;
  price_delta: number | null;
  latest_seen_at: string | null;
  latest_scrape_run_id: number | null;
};

type TrackingResponse = {
  products?: TrackedProductSummary[];
  message?: string;
};

type SortKey = "title" | "latest_price" | "price_delta" | "latest_seen_at";

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: "latest_seen_at", label: "Latest event" },
  { key: "title", label: "Title" },
  { key: "latest_price", label: "Latest price" },
  { key: "price_delta", label: "Price delta" },
];

function getNextUtcOne(now: Date): Date {
  const next = new Date(now);
  next.setUTCHours(1, 0, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

function formatCountdown(target: Date, now: Date) {
  const remainingMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds
    .toString()
    .padStart(2, "0")}s`;
}

function formatPrice(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
}

function formatDelta(value: number | null) {
  if (typeof value !== "number") {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No observations yet";
  }

  return new Date(value).toLocaleString();
}

export function TrackingClient() {
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<SortKey>("latest_seen_at");
  const [sortDescending, setSortDescending] = React.useState(true);
  const [products, setProducts] = React.useState<TrackedProductSummary[]>([]);
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch("/api/tracked_products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load tracked products");
        }

        const data = (await response.json()) as TrackingResponse;
        if (active) {
          setProducts(Array.isArray(data.products) ? data.products : []);
        }
      } catch (error) {
        console.error("Failed to load tracked products", error);
        if (active) {
          setProducts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const filteredProducts = React.useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const next = products.filter((product) => {
      if (!lowered) {
        return true;
      }

      return [
        product.title,
        product.vendor || "",
        product.store_domain,
        product.product_type || "",
      ].some((value) => value.toLowerCase().includes(lowered));
    });

    const compare = (left: TrackedProductSummary, right: TrackedProductSummary) => {
      if (sortKey === "title") {
        return left.title.localeCompare(right.title);
      }

      if (sortKey === "latest_seen_at") {
        const leftValue = left.latest_seen_at ? new Date(left.latest_seen_at).getTime() : 0;
        const rightValue = right.latest_seen_at ? new Date(right.latest_seen_at).getTime() : 0;
        return leftValue - rightValue;
      }

      const leftValue = left[sortKey] ?? Number.NEGATIVE_INFINITY;
      const rightValue = right[sortKey] ?? Number.NEGATIVE_INFINITY;
      return leftValue - rightValue;
    };

    next.sort((left, right) => {
      const result = compare(left, right);
      return sortDescending ? -result : result;
    });

    return next;
  }, [products, query, sortKey, sortDescending]);

  const metrics = React.useMemo(() => {
    const latestTracked = products.filter((product) => product.latest_price != null);
    const changed = products.filter(
      (product) => product.price_delta != null && product.price_delta !== 0
    );

    return {
      total: products.length,
      live: latestTracked.length,
      changed: changed.length,
    };
  }, [products]);

  const nextScheduledRun = React.useMemo(() => getNextUtcOne(now), [now]);
  const nextScheduledCountdown = React.useMemo(
    () => formatCountdown(nextScheduledRun, now),
    [nextScheduledRun, now]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Tracked products</CardDescription>
            <CardTitle>{metrics.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Live price history</CardDescription>
            <CardTitle>{metrics.live}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Recent price changes</CardDescription>
            <CardTitle>{metrics.changed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/[0.02]">
        <CardHeader className="flex flex-col gap-4 border-b border-white/5 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Active tracking</CardTitle>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Daily at 01:00 UTC</Badge>
              <span>Next run in {nextScheduledCountdown}</span>
              <span>({nextScheduledRun.toUTCString()})</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative min-w-[260px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                className="h-10 pl-9"
                placeholder="Search tracked products"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-0">
              <div className="flex h-10 items-center justify-center px-1">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              <Select
                aria-label="Sort tracked products"
                checkIconPosition="right"
                className="min-w-[180px]"
                data={SORT_OPTIONS.map((option) => ({
                  value: option.key,
                  label: option.label,
                }))}
                onChange={(value) => {
                  if (value) {
                    setSortKey(value as SortKey);
                  }
                }}
                radius="md"
                size="sm"
                styles={{
                  dropdown: {
                    backgroundColor: "#09090b",
                    border: "1px solid rgba(255,255,255,0.12)",
                  },
                  input: {
                    height: "40px",
                    minHeight: "40px",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#fafafa",
                  },
                  item: {
                    color: "#fafafa",
                  },
                  label: {
                    color: "rgba(255,255,255,0.62)",
                  },
                }}
                value={sortKey}
              />
              <Button
                className="h-9 px-4"
                onClick={() => setSortDescending((value) => !value)}
                type="button"
                variant="outline"
              >
                {sortDescending ? "Desc" : "Asc"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Loading tracked products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-lg font-medium">No tracked products yet</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Select products in the results grid, use `Track Selected`, then
                inspect them here.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Latest price</TableHead>
                  <TableHead>Delta</TableHead>
                  <TableHead>Latest event</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.source_product_id}>
                    <TableCell>
                      <Link
                        className="flex items-center gap-3"
                        href={`/products/${product.source_product_id}`}
                      >
                        {product.image_url ? (
                          <Image
                            alt={product.title}
                            className="h-11 w-11 rounded-md border border-white/10 object-cover"
                            height={44}
                            src={product.image_url}
                            width={44}
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-md border border-dashed border-white/10 text-[10px] text-muted-foreground">
                            N/A
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium">{product.title}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {product.vendor || "Unknown vendor"}
                            {product.product_type ? ` • ${product.product_type}` : ""}
                          </div>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span>{product.store_domain}</span>
                        {product.store_platform && (
                          <Badge className="w-fit capitalize" variant="outline">
                            {product.store_platform}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {product.schedule_label}
                      </span>
                    </TableCell>
                    <TableCell>{formatPrice(product.latest_price)}</TableCell>
                    <TableCell>
                      <span
                        className={
                          typeof product.price_delta !== "number"
                            ? "text-muted-foreground"
                            : product.price_delta > 0
                              ? "text-rose-400"
                              : product.price_delta < 0
                                ? "text-emerald-400"
                                : "text-muted-foreground"
                        }
                      >
                        {formatDelta(product.price_delta)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(product.latest_seen_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 transition hover:text-foreground"
                        href={`/products/${product.source_product_id}`}
                      >
                        Details
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
