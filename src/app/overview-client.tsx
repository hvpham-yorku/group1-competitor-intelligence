"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";
import { MantineProvider, Select, useMantineTheme } from "@mantine/core";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  OverviewDateRange,
  OverviewPriceChangeRow,
  OverviewResponse,
} from "@/services/overview/types";

function formatPrice(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
}

function formatDelta(value: number | null) {
  if (typeof value !== "number") {
    return "N/A";
  }

  return `${value > 0 ? "+" : ""}$${value.toFixed(2)}`;
}

function ProductCell({ row }: { row: OverviewPriceChangeRow }) {
  return (
    <Link
      href={`/products/${row.source_product_id}`}
      className="flex items-center gap-3 py-2 hover:opacity-90"
    >
      {row.image_url ? (
        <Image
          src={row.image_url}
          alt={row.title}
          width={40}
          height={40}
          className="h-10 w-10 rounded border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-[10px] text-muted-foreground">
          N/A
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{row.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {row.vendor || row.store_domain}
        </div>
      </div>
    </Link>
  );
}

export function OverviewClient({ initialData }: { initialData: OverviewResponse }) {
  const [data, setData] = React.useState(initialData);
  const [loading, setLoading] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<OverviewDateRange>(initialData.date_range);

  const fetchData = React.useCallback(async (nextDateRange: OverviewDateRange) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("pageSize", "5000");
      params.set("dateRange", nextDateRange);
      params.set("deltaDirection", "all");
      params.set("sortKey", "latest_seen_at");
      params.set("sortOrder", "desc");

      const response = await fetch(`/api/overview?${params.toString()}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load overview");
      }

      const next = (await response.json()) as OverviewResponse;
      setData(next);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const columns = React.useMemo<MRT_ColumnDef<OverviewPriceChangeRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Product",
        size: 320,
        Cell: ({ row }) => <ProductCell row={row.original} />,
      },
      {
        accessorKey: "store_domain",
        header: "Store",
        filterVariant: "select",
        mantineFilterSelectProps: {
          data: Array.from(new Set(data.rows.map((row) => row.store_domain))).map((value) => ({
            value,
            label: value,
          })),
        },
      },
      {
        accessorKey: "previous_price",
        header: "Previous",
        Cell: ({ row }) => <span>{formatPrice(row.original.previous_price)}</span>,
      },
      {
        accessorKey: "latest_price",
        header: "Latest",
        Cell: ({ row }) => <span>{formatPrice(row.original.latest_price)}</span>,
      },
      {
        accessorKey: "price_delta",
        header: "Delta",
        filterVariant: "range-slider",
        Cell: ({ row }) => (
          <span
            className={
              (row.original.price_delta ?? 0) > 0
                ? "text-rose-400"
                : (row.original.price_delta ?? 0) < 0
                  ? "text-emerald-400"
                  : "text-muted-foreground"
            }
          >
            {formatDelta(row.original.price_delta)}
          </span>
        ),
      },
      {
        accessorKey: "latest_seen_at",
        header: "Updated",
        Cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.latest_seen_at).toLocaleString()}
          </span>
        ),
      },
    ],
    [data.rows]
  );

  const table = useMantineReactTable({
    columns,
    data: data.rows,
    enableColumnActions: true,
    enableColumnFilters: true,
    enableDensityToggle: false,
    enableGlobalFilter: true,
    enableSorting: true,
    enableStickyHeader: true,
    initialState: {
      density: "xs",
      pagination: { pageIndex: 0, pageSize: 20 },
      showColumnFilters: true,
      sorting: [{ id: "latest_seen_at", desc: true }],
    },
    mantineSearchTextInputProps: {
      placeholder: "Search overview",
    },
    mantinePaginationProps: {
      rowsPerPageOptions: ["20", "40", "80"],
      withEdges: true,
    },
    mantineTableContainerProps: {
      sx: {
        maxHeight: "58vh",
        minHeight: "400px",
      },
    },
    mantinePaperProps: {
      sx: {
        backgroundColor: "#0C0C0D",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "0.5rem",
      },
    },
    mantineTableHeadCellProps: {
      sx: {
        backgroundColor: "#171717",
        color: "#FFFFFF",
        borderBottom: "none",
      },
    },
    mantineTableBodyCellProps: {
      sx: {
        color: "#D4D4D8",
        borderBottom: "none",
      },
    },
    mantineTopToolbarProps: {
      sx: {
        backgroundColor: "#0C0C0D",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      },
    },
    mantineBottomToolbarProps: {
      sx: {
        backgroundColor: "#0C0C0D",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      },
    },
  });

  const theme = useMantineTheme();

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked products</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.kpis.tracked_products}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tracked competitors</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.kpis.tracked_competitors}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Recent deltas</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.kpis.price_changes}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Price up</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-400">{data.kpis.increases}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Price down</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-400">{data.kpis.decreases}</CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <Select
          value={dateRange}
          onChange={(value) => {
            const nextValue = (value as OverviewDateRange | null) ?? "7d";
            setDateRange(nextValue);
            void fetchData(nextValue);
          }}
          data={[
            { value: "24h", label: "24 hours" },
            { value: "7d", label: "7 days" },
            { value: "30d", label: "30 days" },
            { value: "90d", label: "90 days" },
            { value: "all", label: "All time" },
          ]}
          className="max-w-[180px]"
        />
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-white/70" />
            Updating...
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <MantineProvider theme={{ ...theme, primaryColor: "blue" }}>
          <MantineReactTable table={table} />
        </MantineProvider>

        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardTitle className="text-base">Largest matched gaps</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.matched_preview.length === 0 ? (
              <div className="text-sm text-muted-foreground">No approved matches yet.</div>
            ) : (
              data.matched_preview.map((row) => (
                <div
                  key={`${row.owned_source_product_id}:${row.competitor_source_product_id}`}
                  className="rounded-md border border-white/10 px-3 py-2"
                >
                  <Link
                    href={`/products/${row.owned_source_product_id}`}
                    className="block truncate text-sm font-medium text-white hover:underline"
                  >
                    {row.owned_title}
                  </Link>
                  <div className="mt-1 text-xs text-muted-foreground">{row.competitor_store_domain}</div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{formatDelta(row.gap_delta)}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatPrice(row.owned_latest_price)} vs {formatPrice(row.competitor_latest_price)}
                    </span>
                  </div>
                </div>
              ))
            )}
            <Link href="/analysis" className="inline-block text-sm text-primary hover:underline">
              Open analysis
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
