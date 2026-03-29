"use client";

import * as React from "react";
import Image from "next/image";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";
import { Box, MantineProvider, Popover, TextInput, useMantineTheme } from "@mantine/core";
import { Search, ChevronDown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  EmbeddingSyncResult,
  MatchableProduct,
  MatchingWorkspace,
  ProductMatchRecord,
  ProductMatchSuggestion,
} from "@/services/matching/types";

type ComparisonRow = {
  id: string;
  owned_product: MatchableProduct;
  competitor_product: MatchableProduct | null;
  source: "suggested" | "manual" | "empty";
  score: number | null;
  method: string;
};

type SearchState = {
  rowId: number;
  query: string;
  loading: boolean;
  results: MatchableProduct[];
};

function formatPrice(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
}

function buildComparisonRows(workspace: MatchingWorkspace): ComparisonRow[] {
  const reviewedByOwnedId = new Map<number, ProductMatchRecord>();
  const suggestedByOwnedId = new Map<number, ProductMatchSuggestion>();

  for (const match of workspace.reviewed_matches) {
    if (match.status === "approved") {
      reviewedByOwnedId.set(match.owned_product.source_product_id, match);
    }
  }

  for (const suggestion of workspace.suggested_matches) {
    if (!reviewedByOwnedId.has(suggestion.owned_product.source_product_id)) {
      suggestedByOwnedId.set(suggestion.owned_product.source_product_id, suggestion);
    }
  }

  return workspace.owned_products.map((ownedProduct) => {
    const reviewed = reviewedByOwnedId.get(ownedProduct.source_product_id);
    if (reviewed) {
      return {
        id: String(ownedProduct.source_product_id),
        owned_product: ownedProduct,
        competitor_product: reviewed.competitor_product,
        source: "manual",
        score: reviewed.score,
        method: reviewed.method,
      };
    }

    const suggested = suggestedByOwnedId.get(ownedProduct.source_product_id);
    if (suggested) {
      return {
        id: String(ownedProduct.source_product_id),
        owned_product: ownedProduct,
        competitor_product: suggested.competitor_product,
        source: "suggested",
        score: suggested.score,
        method: suggested.method,
      };
    }

    return {
      id: String(ownedProduct.source_product_id),
      owned_product: ownedProduct,
      competitor_product: null,
      source: "empty",
      score: null,
      method: "manual-selection",
    };
  });
}

function ProductPreview({
  product,
  emptyText,
}: {
  product: MatchableProduct | null;
  emptyText: string;
}) {
  if (!product) {
    return <div className="text-sm text-muted-foreground">{emptyText}</div>;
  }

  return (
    <div className="flex items-center gap-3 py-1">
      {product.image_url ? (
        <Image
          src={product.image_url}
          alt={product.title}
          width={44}
          height={44}
          className="h-11 w-11 rounded-md border border-white/10 object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-[10px] text-muted-foreground">
          N/A
        </div>
      )}
      <div className="min-w-0">
        <div className="truncate font-medium text-sm leading-tight text-white">{product.title}</div>
        <div className="truncate text-xs text-muted-foreground">
          {product.vendor || product.product_type || product.store_domain}
        </div>
        <div className="text-xs text-muted-foreground">{formatPrice(product.latest_price)}</div>
      </div>
    </div>
  );
}

export function MatchingClient({ initialWorkspace }: { initialWorkspace: MatchingWorkspace }) {
  const [workspace, setWorkspace] = React.useState(initialWorkspace);
  const [working, setWorking] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [titleQuery, setTitleQuery] = React.useState("");
  const [searchState, setSearchState] = React.useState<SearchState | null>(null);
  const searchTimeoutRef = React.useRef<number | null>(null);

  const selectedStore = workspace.selected_store;
  const selectableStores = workspace.stores.filter((store) => !store.is_owned_store);

  const loadWorkspace = React.useCallback(async (storeDomain?: string) => {
    const params = new URLSearchParams();
    if (storeDomain) {
      params.set("store", storeDomain);
    }

    const response = await fetch(`/api/matching?${params.toString()}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load matching workspace");
    }

    const nextWorkspace = (await response.json()) as MatchingWorkspace;
    setWorkspace(nextWorkspace);
    setSearchState(null);
  }, []);

  const handleGenerateEmbeddings = async () => {
    if (!selectedStore || working) {
      return;
    }

    setWorking(true);
    setMessage(null);
    try {
      const response = await fetch("/api/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync_embeddings",
          store_domain: selectedStore.store_domain,
          overwrite: false,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate embeddings");
      }

      const result = (await response.json()) as EmbeddingSyncResult;
      await loadWorkspace(selectedStore.store_domain);
      setMessage(`Embedded ${result.generated_embeddings} products for ${result.store_domain}.`);
    } catch (error) {
      console.error(error);
      setMessage("Embedding generation failed.");
    } finally {
      setWorking(false);
    }
  };

  const runSearch = React.useCallback(async (rowId: number, query: string) => {
    if (!selectedStore) {
      return;
    }

    setSearchState((current) =>
      current && current.rowId === rowId ? { ...current, query, loading: true } : current
    );

    try {
      const params = new URLSearchParams({
        store: selectedStore.store_domain,
        q: query,
        limit: "12",
      });
      const response = await fetch(`/api/products/search?${params.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to search competitor products");
      }

      const results = (await response.json()) as MatchableProduct[];
      setSearchState((current) =>
        current && current.rowId === rowId ? { ...current, query, loading: false, results } : current
      );
    } catch (error) {
      console.error(error);
      setSearchState((current) =>
        current && current.rowId === rowId ? { ...current, query, loading: false, results: [] } : current
      );
    }
  }, [selectedStore]);

  const openSearch = React.useCallback((row: ComparisonRow) => {
    const initialQuery = row.competitor_product?.title ?? "";
    setSearchState({
      rowId: row.owned_product.source_product_id,
      query: initialQuery,
      loading: true,
      results: [],
    });
    void runSearch(row.owned_product.source_product_id, initialQuery);
  }, [runSearch]);

  const handleSearchInput = React.useCallback((rowId: number, query: string) => {
    setSearchState((current) =>
      current && current.rowId === rowId ? { ...current, query, loading: true } : current
    );

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      void runSearch(rowId, query);
    }, 200);
  }, [runSearch]);

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const comparisonRows = React.useMemo(() => buildComparisonRows(workspace), [workspace]);
  const filteredRows = React.useMemo(() => {
    const query = titleQuery.trim().toLowerCase();
    if (!query) {
      return comparisonRows;
    }

    return comparisonRows.filter((row) =>
      row.owned_product.title.toLowerCase().includes(query)
    );
  }, [comparisonRows, titleQuery]);

  const columns = React.useMemo<MRT_ColumnDef<ComparisonRow>[]>(
    () => [
      {
        id: "owned_product",
        header: "Your Product",
        size: 360,
        accessorFn: (row) => row.owned_product.title,
        Cell: ({ row }) => (
          <ProductPreview product={row.original.owned_product} emptyText="No product" />
        ),
      },
      {
        id: "competitor_product",
        header: selectedStore ? `${selectedStore.store_domain} Match` : "Competitor Match",
        size: 420,
        accessorFn: (row) => row.competitor_product?.title ?? "",
        Cell: ({ row }) => {
          const currentRow = row.original;
          const isSearchOpen = searchState?.rowId === currentRow.owned_product.source_product_id;
          const buttonLabel = currentRow.competitor_product ? null : "Select match";

          return (
            <div className="space-y-3">
              <Popover
                opened={isSearchOpen}
                onChange={(opened) => {
                  if (!opened) {
                    setSearchState(null);
                  }
                }}
                width={384}
                position="bottom-start"
                offset={8}
                withinPortal
                shadow="md"
              >
                <Popover.Target>
                  <button
                    type="button"
                    className="w-full rounded-md border border-white/10 px-3 py-2 text-left transition hover:bg-white/[0.03]"
                    onClick={() => openSearch(currentRow)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <ProductPreview
                          product={currentRow.competitor_product}
                          emptyText="No competitor product selected"
                        />
                        {buttonLabel ? (
                          <div className="pt-1 text-xs text-muted-foreground">{buttonLabel}</div>
                        ) : null}
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </div>
                  </button>
                </Popover.Target>

                <Popover.Dropdown className="border-white/10 bg-[#0C0C0D] p-3">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <input
                        autoFocus
                        value={searchState?.query ?? ""}
                        onChange={(event) =>
                          handleSearchInput(currentRow.owned_product.source_product_id, event.target.value)
                        }
                        placeholder="Search competitor products"
                        className="flex h-10 w-full rounded-md border border-white/10 bg-black/20 pl-9 pr-3 text-sm text-white outline-none"
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSearchState(null)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-white/10">
                    {searchState?.loading ? (
                      <div className="px-3 py-6 text-sm text-muted-foreground">Loading...</div>
                    ) : (searchState?.results.length ?? 0) > 0 ? (
                      searchState?.results.map((product) => (
                        <button
                          key={product.source_product_id}
                          type="button"
                          className="flex w-full items-center gap-3 border-t border-white/10 px-3 py-3 text-left first:border-t-0 hover:bg-white/[0.03]"
                          onClick={() => {
                            void (async () => {
                              setWorking(true);
                              setMessage(null);
                              try {
                                const response = await fetch("/api/matching", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "set_match",
                                    owned_source_product_id: currentRow.owned_product.source_product_id,
                                    competitor_source_product_id: product.source_product_id,
                                  }),
                                });

                                if (!response.ok) {
                                  throw new Error("Failed to save match");
                                }

                                setSearchState(null);
                                await loadWorkspace(selectedStore?.store_domain);
                              } catch (error) {
                                console.error(error);
                                setMessage("Failed to save match.");
                              } finally {
                                setWorking(false);
                              }
                            })();
                          }}
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
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.03] text-[10px] text-muted-foreground">
                              N/A
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-white">{product.title}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {product.vendor || product.product_type || product.store_domain}
                            </div>
                            <div className="text-xs text-muted-foreground">{formatPrice(product.latest_price)}</div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-6 text-sm text-muted-foreground">No products found.</div>
                    )}
                  </div>
                </Popover.Dropdown>
              </Popover>
            </div>
          );
        },
      },
    ],
    [handleSearchInput, loadWorkspace, openSearch, searchState, selectedStore]
  );

  const table = useMantineReactTable({
    columns,
    data: filteredRows,
    getRowId: (row) => row.id,
    enableColumnActions: false,
    enableSorting: true,
    enableFilters: false,
    enableGlobalFilter: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enablePagination: true,
    enableStickyHeader: true,
    initialState: {
      pagination: { pageIndex: 0, pageSize: 20 },
      density: "xs",
      sorting: [{ id: "owned_product", desc: false }],
    },
    mantineTableContainerProps: {
      sx: {
        maxHeight: "72vh",
        minHeight: "520px",
      },
    },
    mantineTableProps: {
      highlightOnHover: true,
      striped: false,
      verticalSpacing: "xs",
      horizontalSpacing: "xs",
      fontSize: "sm",
      sx: {
        borderCollapse: "collapse",
        borderSpacing: 0,
      },
    },
    mantinePaperProps: {
      sx: {
        backgroundColor: "#0C0C0D",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "0.5rem",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },
    },
    mantineTableHeadCellProps: {
      sx: {
        backgroundColor: "#171717",
        color: "#FFFFFF",
        fontSize: "14px",
        fontWeight: 500,
        borderBottom: "none",
      },
    },
    mantineTableBodyCellProps: {
      sx: {
        color: "#BBBEC9",
        fontSize: "14px",
        borderBottom: "none",
        verticalAlign: "top",
      },
    },
    mantineTopToolbarProps: {
      sx: {
        backgroundColor: "#0C0C0D",
        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
      },
    },
    mantineBottomToolbarProps: {
      sx: {
        backgroundColor: "#0C0C0D",
        borderTop: "1px solid rgba(255, 255, 255, 0.05)",
      },
    },
    renderTopToolbar: ({ table }) => (
      <Box className="flex w-full flex-col gap-4 px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white">Matching</h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Review your catalog beside one competitor store. Search and replace matches inline.
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              Your store: {workspace.owned_store?.store_domain ?? "Set an owned store first in Settings"}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground" htmlFor="matching-store">
                Competitor
              </label>
              <select
                id="matching-store"
                value={selectedStore?.store_domain ?? ""}
                onChange={(event) => void loadWorkspace(event.target.value)}
                className="flex h-10 min-w-64 rounded-md border border-white/10 bg-[#0C0C0D] px-3 py-2 text-sm text-white"
              >
                {selectableStores.map((store) => (
                  <option key={store.store_domain} value={store.store_domain}>
                    {store.store_domain}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={!selectedStore || working}
                onClick={() => void handleGenerateEmbeddings()}
                className="gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Generate Missing
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-[280px] flex-1 max-w-md">
            <TextInput
              value={titleQuery}
              onChange={(event) => {
                setTitleQuery(event.currentTarget.value);
                table.setPageIndex(0);
              }}
              placeholder="Search your products"
              size="sm"
              leftSection={<Search className="h-4 w-4" />}
              styles={{
                input: {
                  backgroundColor: "#0C0C0D",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  color: "#FFFFFF",
                },
                section: {
                  color: "#7C7F8A",
                },
              }}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Search and sort by your product title.
          </div>
        </div>
      </Box>
    ),
    renderEmptyRowsFallback: () => (
      <div className="px-4 py-12 text-center text-sm text-muted-foreground">
        Set an owned store and select a competitor store to start comparing products.
      </div>
    ),
  });

  const globalTheme = useMantineTheme();

  return (
    <div className="space-y-4">
      {message ? (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
          {message}
        </div>
      ) : null}

      <MantineProvider theme={{ ...globalTheme, primaryColor: "blue" }}>
        <MantineReactTable table={table} />
      </MantineProvider>
    </div>
  );
}
