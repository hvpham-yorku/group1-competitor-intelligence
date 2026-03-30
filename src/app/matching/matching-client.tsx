"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MantineReactTable,
  type MRT_ColumnDef,
  useMantineReactTable,
} from "mantine-react-table";
import { Box, Checkbox, Loader, MantineProvider, Modal, Pagination, Popover, Progress, Select, ScrollArea, SegmentedControl, TextInput, useMantineTheme } from "@mantine/core";
import { Search, ChevronDown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type {
  GenerateRecommendationsResult,
  MatchableProduct,
  MatchingWorkspace,
  RecommendationPagePayload,
  RecommendationGroupPayload,
  ProductMatchSuggestion,
} from "@/services/matching/types";
import type { ProductSearchPage, ProductSearchResult } from "@/services/products/search-types";
import type { ProductMatchRecord } from "@/services/matching/types";

type ComparisonRow = {
  id: string;
  owned_product: MatchableProduct;
  competitor_product: MatchableProduct | null;
  source: "manual" | "title_suggested" | "empty";
  score: number | null;
  method: string;
};

type SearchState = {
  rowId: number;
  query: string;
  loading: boolean;
  results: MatchableProduct[];
};

type RecommendationGroup = {
  owned_product: MatchableProduct;
  candidates: ProductMatchSuggestion[];
};

function formatPrice(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
}

function getSuggestionKey(suggestion: ProductMatchSuggestion) {
  return `${suggestion.owned_product.source_product_id}:${suggestion.competitor_product.source_product_id}`;
}

function mapRecommendationGroups(
  groups: RecommendationGroupPayload[]
): ProductMatchSuggestion[] {
  return groups.flatMap((group) =>
    group.candidates.map((candidate) => ({
      owned_product: {
        ...group.owned_product,
        variant_titles: [],
        latest_observed_at: null,
        embedding_provider: null,
        embedding_model: null,
        embedding_dimensions: null,
        embedded_at: null,
      },
      competitor_product: {
        ...candidate.competitor_product,
        variant_titles: [],
        latest_observed_at: null,
        embedding_provider: null,
        embedding_model: null,
        embedding_dimensions: null,
        embedded_at: null,
      },
      score: candidate.score,
      method: candidate.method,
    }))
  );
}

function mapSearchResultToMatchableProduct(result: ProductSearchResult): MatchableProduct {
  return {
    source_product_id: result.source_product_id,
    store_domain: result.store_domain,
    title: result.title,
    product_url: result.product_url,
    image_url: result.image_url,
    vendor: result.vendor,
    product_type: result.product_type,
    variant_titles: [],
    latest_price: result.latest_price,
    latest_observed_at: result.latest_observed_at,
    embedding_provider: null,
    embedding_model: null,
    embedding_dimensions: null,
    embedded_at: null,
  };
}

function buildComparisonRows(workspace: MatchingWorkspace): ComparisonRow[] {
  const reviewedByOwnedId = new Map<number, ProductMatchRecord>();
  const titleSuggestedByOwnedId = new Map<number, ProductMatchSuggestion>();

  for (const match of workspace.reviewed_matches) {
    if (match.status === "approved") {
      reviewedByOwnedId.set(match.owned_product.source_product_id, match);
    }
  }

  for (const suggestion of workspace.title_suggested_matches) {
    titleSuggestedByOwnedId.set(suggestion.owned_product.source_product_id, suggestion);
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

    const titleSuggested = titleSuggestedByOwnedId.get(ownedProduct.source_product_id);
    if (titleSuggested) {
      return {
        id: String(ownedProduct.source_product_id),
        owned_product: ownedProduct,
        competitor_product: titleSuggested.competitor_product,
        source: "title_suggested",
        score: titleSuggested.score,
        method: titleSuggested.method,
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
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span className="truncate">{product.vendor || product.product_type || product.store_domain}</span>
          <span>{formatPrice(product.latest_price)}</span>
          <Link
            href={`/products/${product.source_product_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-300 hover:text-blue-200 hover:underline"
          >
            Open details
          </Link>
        </div>
      </div>
    </div>
  );
}

export function MatchingClient({ initialWorkspace }: { initialWorkspace: MatchingWorkspace }) {
  const [workspace, setWorkspace] = React.useState(initialWorkspace);
  const [working, setWorking] = React.useState(false);
  const [workspaceLoading, setWorkspaceLoading] = React.useState(false);
  const [selectedStoreDomain, setSelectedStoreDomain] = React.useState(initialWorkspace.selected_store?.store_domain ?? "");
  const [titleQuery, setTitleQuery] = React.useState(initialWorkspace.title_query ?? "");
  const [pagination, setPagination] = React.useState({
    pageIndex: Math.max(0, (initialWorkspace.page ?? 1) - 1),
    pageSize: initialWorkspace.page_size ?? 20,
  });
  const [matchFilter, setMatchFilter] = React.useState<"all" | "matched" | "unmatched">(
    initialWorkspace.match_filter ?? "all"
  );
  const [searchState, setSearchState] = React.useState<SearchState | null>(null);
  const [recommendationsOpen, setRecommendationsOpen] = React.useState(false);
  const [recommendationsLoading, setRecommendationsLoading] = React.useState(false);
  const [recommendationProgress, setRecommendationProgress] = React.useState(0);
  const [recommendationPhase, setRecommendationPhase] = React.useState<"idle" | "embedding" | "finalizing">("idle");
  const [recommendationStageSummary, setRecommendationStageSummary] = React.useState<string>("");
  const [recommendationStartedAt, setRecommendationStartedAt] = React.useState<number | null>(null);
  const [recommendationElapsedSeconds, setRecommendationElapsedSeconds] = React.useState(0);
  const [recommendationPickerRowId, setRecommendationPickerRowId] = React.useState<number | null>(null);
  const [latestSuggestions, setLatestSuggestions] = React.useState<ProductMatchSuggestion[]>(
    initialWorkspace.suggested_matches
  );
  const [recommendationThreshold, setRecommendationThreshold] = React.useState(0.85);
  const [acceptedSuggestionKeys, setAcceptedSuggestionKeys] = React.useState<string[]>([]);
  const [selectedSuggestionByOwnedId, setSelectedSuggestionByOwnedId] = React.useState<Record<number, string>>({});
  const [showAcceptedOnly, setShowAcceptedOnly] = React.useState(false);
  const [recommendationQuery, setRecommendationQuery] = React.useState("");
  const [recommendationPagination, setRecommendationPagination] = React.useState({
    page: 1,
    pageSize: 20,
    totalGroups: 0,
    totalPages: 1,
  });
  const [recommendationCandidateSearch, setRecommendationCandidateSearch] = React.useState<Record<number, string>>({});
  const [loadedSuggestionsByKey, setLoadedSuggestionsByKey] = React.useState<Record<string, ProductMatchSuggestion>>({});
  const searchTimeoutRef = React.useRef<number | null>(null);
  const initializedRef = React.useRef(false);

  const selectedStore = workspace.selected_store;
  const selectableStores = workspace.stores.filter((store) => !store.is_owned_store);

  const loadWorkspace = React.useCallback(async (input?: {
    storeDomain?: string;
    pageIndex?: number;
    pageSize?: number;
    titleQuery?: string;
    matchFilter?: "all" | "matched" | "unmatched";
  }) => {
    const params = new URLSearchParams();
    const storeDomain = input?.storeDomain ?? selectedStoreDomain;
    const pageIndex = input?.pageIndex ?? pagination.pageIndex;
    const pageSize = input?.pageSize ?? pagination.pageSize;
    const query = input?.titleQuery ?? titleQuery;
    const nextMatchFilter = input?.matchFilter ?? matchFilter;

    if (storeDomain) {
      params.set("store", storeDomain);
    }
    params.set("page", String(pageIndex + 1));
    params.set("pageSize", String(pageSize));
    if (query.trim()) {
      params.set("title", query.trim());
    }
    params.set("matchFilter", nextMatchFilter);

    setWorkspaceLoading(true);
    try {
      const response = await fetch(`/api/matching?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load matching workspace");
      }

      const nextWorkspace = (await response.json()) as MatchingWorkspace;
      setWorkspace(nextWorkspace);
      setPagination((current) => {
        const nextPagination = {
          pageIndex: Math.max(0, (nextWorkspace.page ?? 1) - 1),
          pageSize: nextWorkspace.page_size ?? pageSize,
        };

        return current.pageIndex === nextPagination.pageIndex &&
          current.pageSize === nextPagination.pageSize
          ? current
          : nextPagination;
      });
      setSearchState(null);
      setLatestSuggestions([]);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [matchFilter, pagination.pageIndex, pagination.pageSize, selectedStoreDomain, titleQuery]);

  React.useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      void loadWorkspace();
    }, 180);

    return () => window.clearTimeout(timeout);
  }, [loadWorkspace]);

  const handleGenerateEmbeddings = async () => {
    if (!selectedStore || working) {
      return;
    }

    setWorking(true);
    setRecommendationsLoading(true);
    setRecommendationStartedAt(Date.now());
    setRecommendationElapsedSeconds(0);
    setLatestSuggestions([]);
    setRecommendationProgress(6);
    setRecommendationPhase("embedding");
    setRecommendationStageSummary("");
    setAcceptedSuggestionKeys([]);
    setSelectedSuggestionByOwnedId({});
    setRecommendationPickerRowId(null);
    setRecommendationQuery("");
      setRecommendationPagination({
        page: 1,
        pageSize: 20,
        totalGroups: 0,
        totalPages: 1,
      });
    setRecommendationCandidateSearch({});
    setLoadedSuggestionsByKey({});
    setRecommendationsOpen(true);
    try {
      const response = await fetch("/api/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_recommendations",
          store_domain: selectedStore.store_domain,
          page: 1,
          page_size: recommendationPagination.pageSize,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate embeddings");
      }

      setRecommendationPhase("finalizing");
      setRecommendationProgress(94);
      const result = (await response.json()) as GenerateRecommendationsResult;
      await loadWorkspace({ storeDomain: selectedStore.store_domain });
      setSearchState(null);
      setRecommendationPickerRowId(null);
      const nextSuggestions = mapRecommendationGroups(result.suggestions);
      setLatestSuggestions(nextSuggestions);
      setLoadedSuggestionsByKey(
        Object.fromEntries(nextSuggestions.map((suggestion) => [getSuggestionKey(suggestion), suggestion]))
      );
      setRecommendationPagination({
        page: result.page,
        pageSize: result.page_size,
        totalGroups: result.total_groups,
        totalPages: result.total_pages,
      });
      setRecommendationProgress(100);
      setRecommendationStageSummary(
        [
          result.owned_sync
            ? `${result.owned_sync.store_domain}: ${result.owned_sync.generated_embeddings} generated, ${result.owned_sync.skipped_existing_embeddings} cached`
            : null,
          `${result.competitor_sync.store_domain}: ${result.competitor_sync.generated_embeddings} generated, ${result.competitor_sync.skipped_existing_embeddings} cached`,
          `Inputs ${Math.round(result.stage_timings.load_inputs_ms)}ms | Match ${Math.round(result.stage_timings.build_suggestions_ms)}ms`,
        ]
          .filter(Boolean)
          .join(" | ")
      );
    } catch (error) {
      console.error(error);
    } finally {
      setRecommendationsLoading(false);
      setWorking(false);
    }
  };

  React.useEffect(() => {
    if (!recommendationsLoading || !recommendationStartedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setRecommendationElapsedSeconds(
        Math.max(0, Math.floor((Date.now() - recommendationStartedAt) / 1000))
      );
    }, 250);

    return () => window.clearInterval(interval);
  }, [recommendationStartedAt, recommendationsLoading]);

  const applySuggestions = React.useCallback(
    async (suggestions: ProductMatchSuggestion[], storeDomain?: string) => {
      if (suggestions.length === 0) {
        return;
      }

      setWorking(true);
      try {
        for (const suggestion of suggestions) {
          const response = await fetch("/api/matching", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "set_match",
              owned_source_product_id: suggestion.owned_product.source_product_id,
              competitor_source_product_id: suggestion.competitor_product.source_product_id,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to save match");
          }
        }

        await loadWorkspace({ storeDomain: storeDomain ?? selectedStore?.store_domain });
        setLatestSuggestions((current) =>
          current.filter((suggestion) => !suggestions.some(
            (accepted) =>
              accepted.owned_product.source_product_id === suggestion.owned_product.source_product_id &&
              accepted.competitor_product.source_product_id === suggestion.competitor_product.source_product_id
          ))
        );
        setAcceptedSuggestionKeys((current) =>
          current.filter((key) =>
            !suggestions.some((suggestion) => getSuggestionKey(suggestion) === key)
          )
        );
        setLoadedSuggestionsByKey((current) => {
          const next = { ...current };
          for (const suggestion of suggestions) {
            delete next[getSuggestionKey(suggestion)];
          }
          return next;
        });
        setSelectedSuggestionByOwnedId((current) => {
          const next = { ...current };
          for (const suggestion of suggestions) {
            delete next[suggestion.owned_product.source_product_id];
          }
          return next;
        });
        setRecommendationPickerRowId(null);
      } catch (error) {
        console.error(error);
      } finally {
        setWorking(false);
      }
    },
    [loadWorkspace, selectedStore?.store_domain]
  );

  const loadRecommendationPage = React.useCallback(
    async (page: number, pageSize?: number) => {
      if (!selectedStore) {
        return;
      }

      const nextPageSize = pageSize ?? recommendationPagination.pageSize;
      setWorking(true);
      try {
        const response = await fetch("/api/matching", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "list_recommendations",
            store_domain: selectedStore.store_domain,
            page,
            page_size: nextPageSize,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to load recommendation page");
        }

        const result = (await response.json()) as RecommendationPagePayload;
        const nextSuggestions = mapRecommendationGroups(result.suggestions);
        setLatestSuggestions(nextSuggestions);
        setLoadedSuggestionsByKey((current) => ({
          ...current,
          ...Object.fromEntries(nextSuggestions.map((suggestion) => [getSuggestionKey(suggestion), suggestion])),
        }));
        setRecommendationPagination({
          page: result.page,
          pageSize: result.page_size,
          totalGroups: result.total_groups,
          totalPages: result.total_pages,
        });
        setRecommendationPickerRowId(null);
      } catch (error) {
        console.error(error);
      } finally {
        setWorking(false);
      }
    },
    [recommendationPagination.pageSize, selectedStore]
  );

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

      const results = (await response.json()) as ProductSearchPage;
      setSearchState((current) =>
        current && current.rowId === rowId
          ? { ...current, query, loading: false, results: results.items.map(mapSearchResultToMatchableProduct) }
          : current
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

  React.useEffect(() => {
    if (!recommendationsLoading) {
      setRecommendationProgress(0);
      setRecommendationPhase("idle");
      return;
    }

    setRecommendationProgress(10);
    setRecommendationPhase("embedding");
    const milestones = [18, 28, 40, 52, 60, 68, 76, 84];
    let index = 0;

    const interval = window.setInterval(() => {
      setRecommendationProgress((current) => {
        const next = milestones[index] ?? current;
        index = Math.min(index + 1, milestones.length);
        return current >= 84 ? current : Math.max(current, next);
      });
    }, 500);

    return () => {
      window.clearInterval(interval);
    };
  }, [recommendationsLoading]);

  const comparisonRows = React.useMemo(() => buildComparisonRows(workspace), [workspace]);
  const isAcceptedSuggestion = React.useCallback(
    (suggestion: ProductMatchSuggestion) =>
      acceptedSuggestionKeys.includes(getSuggestionKey(suggestion)),
    [acceptedSuggestionKeys]
  );
  const recommendationGroups = React.useMemo(() => {
    const grouped = new Map<number, RecommendationGroup>();

    for (const suggestion of latestSuggestions) {
      const existing = grouped.get(suggestion.owned_product.source_product_id);
      if (existing) {
        existing.candidates.push(suggestion);
      } else {
        grouped.set(suggestion.owned_product.source_product_id, {
          owned_product: suggestion.owned_product,
          candidates: [suggestion],
        });
      }
    }

    return Array.from(grouped.values()).map((group) => ({
      ...group,
      candidates: [...group.candidates].sort((left, right) => right.score - left.score),
    }));
  }, [latestSuggestions]);

  const getActiveSuggestion = React.useCallback(
    (group: RecommendationGroup) => {
      const selectedKey = selectedSuggestionByOwnedId[group.owned_product.source_product_id];
      return (
        group.candidates.find((candidate) => getSuggestionKey(candidate) === selectedKey) ??
        group.candidates[0]
      );
    },
    [selectedSuggestionByOwnedId]
  );

  const visibleRecommendationGroups = React.useMemo(() => {
    const normalizedQuery = recommendationQuery.trim().toLowerCase();

    return recommendationGroups.filter((group) => {
      const activeSuggestion = getActiveSuggestion(group);
      if (!activeSuggestion) {
        return false;
      }

      const passesAccepted = showAcceptedOnly ? isAcceptedSuggestion(activeSuggestion) : true;
      if (!passesAccepted) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystacks = [
        group.owned_product.title,
        activeSuggestion.competitor_product.title,
        ...group.candidates.map((candidate) => candidate.competitor_product.title),
      ]
        .filter(Boolean)
        .map((value) => value.toLowerCase());

      return haystacks.some((value) => value.includes(normalizedQuery));
    });
  }, [getActiveSuggestion, isAcceptedSuggestion, recommendationGroups, recommendationQuery, showAcceptedOnly]);
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

                  {currentRow.competitor_product ? (
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const competitorProduct = currentRow.competitor_product;
                          if (!competitorProduct) {
                            return;
                          }

                          void (async () => {
                            setWorking(true);
                            try {
                              const response = await fetch("/api/matching", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  action: "unmatch",
                                  owned_source_product_id: currentRow.owned_product.source_product_id,
                                  competitor_source_product_id: competitorProduct.source_product_id,
                                }),
                              });

                              if (!response.ok) {
                                throw new Error("Failed to remove match");
                              }

                              setSearchState(null);
                              await loadWorkspace({ storeDomain: selectedStore?.store_domain });
                            } catch (error) {
                              console.error(error);
                            } finally {
                              setWorking(false);
                            }
                          })();
                        }}
                      >
                        Remove Match
                      </Button>
                    </div>
                  ) : null}

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
                                await loadWorkspace({ storeDomain: selectedStore?.store_domain });
                              } catch (error) {
                                console.error(error);
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
    data: comparisonRows,
    getRowId: (row) => row.id,
    autoResetPageIndex: false,
    manualPagination: true,
    enableColumnActions: false,
    enableSorting: true,
    enableFilters: false,
    enableGlobalFilter: false,
    enableDensityToggle: false,
    enableFullScreenToggle: false,
    enablePagination: true,
    enableStickyHeader: true,
    onPaginationChange: setPagination,
    state: {
      pagination,
      showProgressBars: workspaceLoading,
    },
    rowCount: workspace.total_owned_products,
    initialState: {
      density: "xs",
      sorting: [{ id: "owned_product", desc: false }],
    },
    mantineTableContainerProps: {
      sx: {
        maxHeight: "60vh",
        minHeight: "420px",
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
    mantinePaginationProps: {
      rowsPerPageOptions: ["20", "40", "80"],
    },
    renderTopToolbar: () => (
      <Box className="flex w-full flex-col gap-4 px-3 py-3">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-white">Matching</h1>
              <div className="text-sm text-muted-foreground">
                Your store: {workspace.owned_store?.store_domain ?? "Set an owned store first in Settings"}
              </div>
            </div>

          <div className="flex flex-wrap items-end gap-3">
            {workspaceLoading ? (
              <div className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-[#0C0C0D]/95 px-3 text-xs text-muted-foreground">
                <Loader className="h-3.5 w-3.5" />
                Updating...
              </div>
            ) : null}
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.18em] text-muted-foreground" htmlFor="matching-store">
                Competitor
              </label>
              <select
                id="matching-store"
                value={selectedStore?.store_domain ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedStoreDomain(value);
                  setPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
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
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              placeholder="Search your products"
              size="sm"
              styles={{
                input: {
                  backgroundColor: "#0C0C0D",
                  borderColor: "rgba(255, 255, 255, 0.1)",
                  color: "#FFFFFF",
                  paddingLeft: "0.75rem",
                },
              }}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl
              value={matchFilter}
              onChange={(value) => {
                setMatchFilter(value as "all" | "matched" | "unmatched");
                setPagination((current) => ({ ...current, pageIndex: 0 }));
              }}
              data={[
                { label: "All", value: "all" },
                { label: "Matched", value: "matched" },
                { label: "Unmatched", value: "unmatched" },
              ]}
            />
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
      <Modal
        opened={recommendationsOpen}
        onClose={() => setRecommendationsOpen(false)}
        title="Top Recommendations"
        centered
        size="90rem"
        styles={{
          content: {
            backgroundColor: "#0C0C0D",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          },
          header: {
            backgroundColor: "#0C0C0D",
          },
          title: {
            color: "#FFFFFF",
            fontWeight: 600,
          },
        }}
      >
        <div className="space-y-3">
          {recommendationsLoading ? (
            <div className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-md border border-white/10 bg-white/[0.02] px-6">
              <Loader size="sm" />
              <div className="w-full max-w-xl space-y-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {workspace.embedding_status
                      ? workspace.embedding_status.owned_missing_embeddings + workspace.embedding_status.competitor_missing_embeddings > 0
                        ? "Embedding missing products..."
                        : "Loading cached embeddings and ranking..."
                      : recommendationPhase === "embedding"
                        ? "Preparing recommendations..."
                        : "Finalizing recommendations..."}
                  </span>
                  <span>
                    {recommendationPhase === "finalizing"
                      ? "Almost done"
                      : `${Math.round(recommendationProgress)}%`}
                  </span>
                </div>
                <Progress
                  value={recommendationPhase === "finalizing" ? undefined : recommendationProgress}
                  size="lg"
                  radius="xl"
                  animate
                />
                <div className="text-xs text-muted-foreground">
                  {workspace.embedding_status
                    ? `${workspace.embedding_status.owned_store_domain}: ${workspace.embedding_status.owned_cached_embeddings}/${workspace.embedding_status.owned_total_products} cached, ${workspace.embedding_status.owned_missing_embeddings} missing`
                    : workspace.owned_store
                      ? `${workspace.owned_store.store_domain}: ${workspace.owned_store.product_count} products`
                      : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  {workspace.embedding_status
                    ? `${workspace.embedding_status.competitor_store_domain}: ${workspace.embedding_status.competitor_cached_embeddings}/${workspace.embedding_status.competitor_total_products} cached, ${workspace.embedding_status.competitor_missing_embeddings} missing`
                    : selectedStore
                      ? `${selectedStore.store_domain}: ${selectedStore.product_count} products`
                      : null}
                </div>
                <div className="text-xs text-muted-foreground">
                  Elapsed: {recommendationElapsedSeconds}s
                </div>
                {recommendationStageSummary ? (
                  <div className="text-xs text-muted-foreground">
                    {recommendationStageSummary}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!recommendationsLoading ? (
            <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-36">
                <TextInput
                  label="Accepted Threshold"
                  value={String(Math.round(recommendationThreshold * 100))}
                  onChange={(event) => {
                    const next = Number.parseFloat(event.currentTarget.value);
                    if (Number.isFinite(next)) {
                      setRecommendationThreshold(Math.max(0, Math.min(next, 100)) / 100);
                    }
                  }}
                  placeholder="85"
                  size="sm"
                />
              </div>
              <Button
                variant="outline"
                className="self-end"
                onClick={() =>
                  setAcceptedSuggestionKeys(
                    visibleRecommendationGroups
                      .map((group) => getActiveSuggestion(group))
                      .filter((suggestion): suggestion is ProductMatchSuggestion => Boolean(suggestion))
                      .filter((suggestion) => suggestion.score >= recommendationThreshold)
                      .map((suggestion) => getSuggestionKey(suggestion))
                  )
                }
              >
                Apply Threshold
              </Button>
              <Checkbox
                checked={showAcceptedOnly}
                onChange={(event) => setShowAcceptedOnly(event.currentTarget.checked)}
                label="Show accepted only"
                className="self-end pb-1"
              />
            </div>
            <div className="min-w-[240px] flex-1 max-w-sm">
              <TextInput
                value={recommendationQuery}
                onChange={(event) => setRecommendationQuery(event.currentTarget.value)}
                placeholder="Search recommendations"
                size="sm"
              />
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.02]">
              {visibleRecommendationGroups.length > 0 ? (
                <table className="w-full table-fixed">
                  <thead className="bg-white/[0.03]">
                    <tr className="border-b border-white/10 text-left">
                      <th className="w-14 px-3 py-3" />
                      <th className="px-3 py-3 text-sm font-medium text-white">Your Product</th>
                      <th className="px-3 py-3 text-sm font-medium text-white">Recommended Match</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRecommendationGroups.map((group) => {
                      const activeSuggestion = getActiveSuggestion(group);
                      if (!activeSuggestion) {
                        return null;
                      }

                      return (
                        <tr
                          key={group.owned_product.source_product_id}
                          className="border-b border-white/10 align-top last:border-b-0"
                        >
                          <td className="px-3 py-3 align-middle">
                            <Checkbox
                              checked={isAcceptedSuggestion(activeSuggestion)}
                              onChange={(event) => {
                                const checked = event.currentTarget.checked;
                                const key = getSuggestionKey(activeSuggestion);
                                setAcceptedSuggestionKeys((current) =>
                                  checked
                                    ? [...current, key]
                                    : current.filter((value) => value !== key)
                                );
                              }}
                              aria-label="Accept recommendation"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <ProductPreview
                              product={group.owned_product}
                              emptyText="No owned product"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Popover
                              opened={recommendationPickerRowId === group.owned_product.source_product_id}
                              onChange={(opened) => {
                                setRecommendationPickerRowId(
                                  opened ? group.owned_product.source_product_id : null
                                );
                              }}
                              width={420}
                              position="bottom-start"
                              offset={8}
                              withinPortal
                              shadow="md"
                            >
                              <Popover.Target>
                                <button
                                  type="button"
                                  className="w-full rounded-md border border-white/10 px-3 py-2 text-left transition hover:bg-white/[0.03]"
                                  onClick={() =>
                                    setRecommendationPickerRowId((current) =>
                                      current === group.owned_product.source_product_id
                                        ? null
                                        : group.owned_product.source_product_id
                                    )
                                  }
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                      <ProductPreview
                                        product={activeSuggestion.competitor_product}
                                        emptyText="No competitor product"
                                      />
                                    </div>
                                    <div className="space-y-1 text-right">
                                      <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                        {Math.round(activeSuggestion.score * 100)}%
                                      </div>
                                      <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
                                    </div>
                                  </div>
                                </button>
                              </Popover.Target>

                              <Popover.Dropdown className="border-white/10 bg-[#0C0C0D] p-3">
                                <div className="mb-3">
                                  <TextInput
                                    value={recommendationCandidateSearch[group.owned_product.source_product_id] ?? ""}
                                    onChange={(event) => {
                                      const value = event.currentTarget.value;
                                      setRecommendationCandidateSearch((current) => ({
                                        ...current,
                                        [group.owned_product.source_product_id]: value,
                                      }))
                                    }}
                                    placeholder="Search candidates"
                                    size="sm"
                                  />
                                </div>
                                <div className="max-h-80 overflow-y-auto rounded-md border border-white/10">
                                  {group.candidates
                                    .filter((candidate) => {
                                      const query =
                                        recommendationCandidateSearch[group.owned_product.source_product_id]
                                          ?.trim()
                                          .toLowerCase() ?? "";
                                      return !query || candidate.competitor_product.title.toLowerCase().includes(query);
                                    })
                                    .map((candidate) => (
                                    <button
                                      key={getSuggestionKey(candidate)}
                                      type="button"
                                      className="flex w-full items-center gap-3 border-t border-white/10 px-3 py-3 text-left first:border-t-0 hover:bg-white/[0.03]"
                                      onClick={() => {
                                        setSelectedSuggestionByOwnedId((current) => ({
                                          ...current,
                                          [group.owned_product.source_product_id]: getSuggestionKey(candidate),
                                        }));
                                        setRecommendationPickerRowId(null);
                                      }}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <ProductPreview
                                          product={candidate.competitor_product}
                                          emptyText="No competitor product"
                                        />
                                      </div>
                                      <div className="shrink-0 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                        {Math.round(candidate.score * 100)}%
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </Popover.Dropdown>
                            </Popover>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="rounded-md border border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-muted-foreground">
                  No recommendations available yet for this competitor.
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end border-t border-white/10 pt-3">
            <div className="mr-auto flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <div>
                Showing{" "}
                {recommendationPagination.totalGroups === 0
                  ? 0
                  : (recommendationPagination.page - 1) * recommendationPagination.pageSize + 1}
                -
                {Math.min(
                  recommendationPagination.page * recommendationPagination.pageSize,
                  recommendationPagination.totalGroups
                )}{" "}
                of {recommendationPagination.totalGroups}
              </div>
              <Select
                value={String(recommendationPagination.pageSize)}
                onChange={(value) => {
                  const nextPageSize = Number(value ?? recommendationPagination.pageSize);
                  if (!Number.isFinite(nextPageSize) || nextPageSize === recommendationPagination.pageSize) {
                    return;
                  }
                  void loadRecommendationPage(1, nextPageSize);
                }}
                data={[
                  { value: "20", label: "20 / page" },
                  { value: "40", label: "40 / page" },
                  { value: "80", label: "80 / page" },
                ]}
                size="xs"
                w={120}
                disabled={working}
              />
              <Pagination
                total={Math.max(1, recommendationPagination.totalPages)}
                value={recommendationPagination.page}
                onChange={(page) => void loadRecommendationPage(page)}
                size="sm"
                boundaries={1}
                siblings={1}
                withEdges
                disabled={working}
              />
            </div>
            <Button
              disabled={working || acceptedSuggestionKeys.length === 0}
              onClick={() =>
                void applySuggestions(
                  Object.values(loadedSuggestionsByKey).filter((suggestion) =>
                    acceptedSuggestionKeys.includes(getSuggestionKey(suggestion))
                  ),
                  selectedStore?.store_domain
                )
              }
            >
              Apply Accepted
            </Button>
          </div>
            </>
          ) : null}
        </div>
      </Modal>

      <MantineProvider theme={{ ...globalTheme, primaryColor: "blue" }}>
        <MantineReactTable table={table} />
      </MantineProvider>
    </div>
  );
}
