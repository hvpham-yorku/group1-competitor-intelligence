"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";
import { MantineProvider, useMantineTheme } from "@mantine/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  MatchedAnalysisResponse,
  MatchedAnalysisRow,
} from "@/services/matched-analysis/types";

function formatPrice(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
}

function formatDelta(value: number | null) {
  if (typeof value !== "number") {
    return "N/A";
  }

  return `${value > 0 ? "+" : ""}$${value.toFixed(2)}`;
}

function ProductPreview({
  title,
  imageUrl,
  href,
  meta,
  external = false,
}: {
  title: string;
  imageUrl: string | null;
  href: string;
  meta: string;
  external?: boolean;
}) {
  const content = (
    <div className="flex min-w-0 items-center gap-3 py-2 hover:opacity-90">
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={title}
          width={40}
          height={40}
          className="h-10 w-10 rounded border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded border border-white/10 bg-white/[0.03] text-[10px] text-muted-foreground">
          N/A
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{meta}</div>
      </div>
    </div>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}

export function AnalysisClient({ initialData }: { initialData: MatchedAnalysisResponse }) {
  const [data, setData] = React.useState(initialData);
  const [unmatchingKeys, setUnmatchingKeys] = React.useState<Set<string>>(new Set());
  const gapValues = React.useMemo(
    () =>
      data.rows
        .map((row) => row.gap_delta)
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
    [data.rows]
  );
  const minGap = gapValues.length > 0 ? Math.floor(Math.min(...gapValues)) : -500;
  const maxGap = gapValues.length > 0 ? Math.ceil(Math.max(...gapValues)) : 500;

  const handleUnmatch = React.useCallback(async (row: MatchedAnalysisRow) => {
    const key = `${row.owned_source_product_id}:${row.competitor_source_product_id}`;
    setUnmatchingKeys((current) => new Set(current).add(key));

    try {
      const response = await fetch("/api/matching", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "unmatch",
          owned_source_product_id: row.owned_source_product_id,
          competitor_source_product_id: row.competitor_source_product_id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to unmatch product");
      }

      setData((current) => {
        const nextRows = current.rows.filter(
          (item) =>
            !(
              item.owned_source_product_id === row.owned_source_product_id &&
              item.competitor_source_product_id === row.competitor_source_product_id
            )
        );

        return {
          ...current,
          rows: nextRows,
          total_rows: Math.max(0, current.total_rows - 1),
          total_pages: Math.max(1, Math.ceil(Math.max(0, current.total_rows - 1) / current.page_size)),
          kpis: {
            ...current.kpis,
            approved_matches: Math.max(0, current.kpis.approved_matches - 1),
            competitors: Array.from(new Set(nextRows.map((item) => item.competitor_store_domain))).length,
            positive_gaps: nextRows.filter((item) => (item.gap_delta ?? 0) > 0).length,
            negative_gaps: nextRows.filter((item) => (item.gap_delta ?? 0) < 0).length,
            neutral_gaps: nextRows.filter((item) => (item.gap_delta ?? 0) === 0).length,
          },
        };
      });
    } catch (error) {
      console.error(error);
    } finally {
      setUnmatchingKeys((current) => {
        const next = new Set(current);
        next.delete(key);
        return next;
      });
    }
  }, []);

  const columns = React.useMemo<MRT_ColumnDef<MatchedAnalysisRow>[]>(
    () => [
      {
        accessorKey: "owned_title",
        header: "Your product",
        size: 160,
        minSize: 120,
        maxSize: 360,
        Cell: ({ row }) => (
          <ProductPreview
            title={row.original.owned_title}
            imageUrl={row.original.owned_image_url}
            href={`/products/${row.original.owned_source_product_id}`}
            meta={`${row.original.owned_store_domain} | ${formatPrice(row.original.owned_latest_price)}`}
          />
        ),
      },
      {
        accessorKey: "competitor_title",
        header: "Matched competitor",
        size: 160,
        minSize: 120,
        maxSize: 360,
        Cell: ({ row }) => (
          <ProductPreview
            title={row.original.competitor_title}
            imageUrl={row.original.competitor_image_url}
            href={row.original.competitor_product_url}
            meta={`${row.original.competitor_store_domain} | ${formatPrice(row.original.competitor_latest_price)}`}
            external
          />
        ),
      },
      {
        accessorFn: (row) => row.gap_delta ?? 0,
        id: "gap_delta",
        header: "Gap",
        filterVariant: "range-slider",
        filterFn: "betweenInclusive",
        mantineFilterRangeSliderProps: {
          min: minGap,
          max: maxGap,
          step: 1,
          minRange: 1,
          label: (value) => `$${value}`,
        },
        size: 120,
        Cell: ({ row }) => (
          <span
            className={
              (row.original.gap_delta ?? 0) > 0
                ? "text-emerald-400"
                : (row.original.gap_delta ?? 0) < 0
                  ? "text-rose-400"
                  : "text-muted-foreground"
            }
          >
            {formatDelta(row.original.gap_delta)}
          </span>
        ),
      },
      {
        accessorKey: "absolute_gap",
        header: "Abs gap",
        size: 110,
        Cell: ({ row }) => <span>{formatPrice(row.original.absolute_gap)}</span>,
      },
      {
        accessorKey: "owned_store_domain",
        header: "Your store",
        size: 140,
        filterVariant: "select",
        mantineFilterSelectProps: {
          data: Array.from(new Set(data.rows.map((row) => row.owned_store_domain))).map((value) => ({
            value,
            label: value,
          })),
        },
      },
      {
        accessorKey: "competitor_store_domain",
        header: "Competitor",
        size: 160,
        filterVariant: "select",
        mantineFilterSelectProps: {
          data: Array.from(new Set(data.rows.map((row) => row.competitor_store_domain))).map((value) => ({
            value,
            label: value,
          })),
        },
      },
      {
        accessorKey: "updated_at",
        header: "Matched at",
        size: 170,
        Cell: ({ row }) => (
          <span className="text-muted-foreground">
            {new Date(row.original.updated_at).toLocaleString()}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        size: 100,
        enableColumnFilter: false,
        enableSorting: false,
        Cell: ({ row }) => {
          const key = `${row.original.owned_source_product_id}:${row.original.competitor_source_product_id}`;
          const loading = unmatchingKeys.has(key);

          return (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading}
              onClick={() => void handleUnmatch(row.original)}
            >
              {loading ? "Removing..." : "Unmatch"}
            </Button>
          );
        },
      },
    ],
    [data.rows, handleUnmatch, maxGap, minGap, unmatchingKeys]
  );

  const table = useMantineReactTable({
    columns,
    data: data.rows,
    enableColumnActions: true,
    enableColumnFilters: true,
    enableColumnResizing: true,
    enableDensityToggle: false,
    enableGlobalFilter: true,
    enableSorting: true,
    enableStickyHeader: true,
    columnResizeMode: "onChange",
    initialState: {
      density: "xs",
      pagination: { pageIndex: 0, pageSize: 20 },
      showColumnFilters: true,
      sorting: [{ id: "absolute_gap", desc: true }],
      columnVisibility: {
        owned_store_domain: false,
        updated_at: false,
      },
    },
    mantineSearchTextInputProps: {
      placeholder: "Search matched analysis",
    },
    mantinePaginationProps: {
      rowsPerPageOptions: ["20", "40", "80"],
      withEdges: true,
    },
    mantineTableContainerProps: {
      sx: {
        maxHeight: "56vh",
        minHeight: "400px",
        overflowX: "auto",
      },
    },
    mantineTableProps: {
      sx: {
        minWidth: "980px",
        tableLayout: "fixed",
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
        whiteSpace: "nowrap",
      },
    },
    mantineTableBodyCellProps: {
      sx: {
        color: "#D4D4D8",
        borderBottom: "none",
        verticalAlign: "top",
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved matches</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.kpis.approved_matches}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Competitors</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.kpis.competitors}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Positive gaps</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-400">{data.kpis.positive_gaps}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Negative gaps</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-rose-400">{data.kpis.negative_gaps}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Neutral gaps</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{data.kpis.neutral_gaps}</CardContent>
        </Card>
      </div>

      <MantineProvider theme={{ ...theme, primaryColor: "blue" }}>
        <MantineReactTable table={table} />
      </MantineProvider>
    </div>
  );
}
