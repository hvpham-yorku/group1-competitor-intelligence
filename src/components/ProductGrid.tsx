// This file implementation is a migration from old ProductGrid.tsx which is based on https://github.com/ag-grid/ag-grid-demos/blob/main/inventory/react/src/InventoryExample.tsx, migrating from ag-grid to MantineTable (built on tanstack table)
// An LLM (Claude Opus 4.6) was used to perform the migration, given context of the legacy grid, as well as mantinetable docs
// prompt: given the context, perform a migration with the exact functionality of the previous implementation
// further edits were made regarding styling and row expansion behaviour
// - Yousif

// The export to csv was based on https://www.mantine-react-table.com/docs/examples/export-csv implementation
// - Abdelrahman 
"use client"

import { useEffect, useMemo, useState, type FC } from "react"
import { MantineReactTable, type MRT_ColumnDef, type MRT_ColumnFiltersState, type MRT_RowSelectionState, MRT_Row, useMantineReactTable } from "mantine-react-table"
import { MantineProvider, useMantineTheme, Box, Menu } from "@mantine/core"
import { ChevronRight, ChevronDown, MoreHorizontal } from "lucide-react"
import { download, generateCsv, mkConfig } from "export-to-csv"
import { IconDownload } from '@tabler/icons-react';
import { Button } from "./ui/button"
import { useSession } from "next-auth/react";
import type { NormalizedProduct, NormalizedVariant } from "@/services/scraper/normalized-types";
import Image from "next/image";

interface ProductGridProps {
    products: ProductRow[];
    sourceUrl?: string;
    showCompetitor?: boolean;
}

type ProductRow = NormalizedProduct & {
    competitor?: string;
};

type TrackedProductSummary = {
    product_url: string;
};

type ExportRow = {
    title: string;
    variant: string;
    price: string;
    availablity: string;
};

const csvConfig = mkConfig({
    fieldSeparator: ',',
    decimalSeparator: '.',
    useKeysAsHeaders: true,
    showColumnHeaders: false
});

function formatDateTime(value?: string) {
    if (!value) {
        return "N/A";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return "N/A";
    }

    return date.toLocaleString();
}

export const ProductGrid: FC<ProductGridProps> = ({ products, sourceUrl }) => {
    const { status } = useSession();
    // Enrich products on the spot in the UI
    const enrichedProducts = useMemo(() => {
        if (!sourceUrl) return products;

        // Clean base URL (remove trailing slash and common paths)
        let baseUrl = sourceUrl.replace(/\/products\.json$/, '').replace(/\/$/, '');

        // Ensure the URL has a protocol (https by default)
        if (!baseUrl.match(/^https?:\/\//)) {
            baseUrl = `https://${baseUrl}`;
        }

        return products.map(p => {
            if (p.handle && !p.product_url) {
                return {
                    ...p,
                    product_url: `${baseUrl}/products/${p.handle}`
                };
            }
            return p;
        });
    }, [products, sourceUrl]);

    const [columnFilters, setColumnFilters] = useState<MRT_ColumnFiltersState>([]);
    const [rowSelection, setRowSelection] = useState<MRT_RowSelectionState>({});
    const [trackedUrls, setTrackedUrls] = useState<Set<string>>(new Set());
    const [trackingSelected, setTrackingSelected] = useState(false);
    const hasCompetitorColumn = useMemo(
        () => products.some((product) => Boolean(product.competitor)),
        [products]
    );

    useEffect(() => {
        if (status !== "authenticated") {
            setTrackedUrls(new Set());
            return;
        }

        let active = true;

        const loadTrackedProducts = async () => {
            try {
                const response = await fetch("/api/tracked_products", {
                    cache: "no-store",
                });

                if (!response.ok) {
                    return;
                }

                const data = await response.json() as { products?: TrackedProductSummary[] };
                const next = new Set(
                    (data.products || [])
                        .map((product) => product.product_url)
                        .filter((url): url is string => typeof url === "string" && url.length > 0)
                );

                if (active) {
                    setTrackedUrls(next);
                }
            } catch (error) {
                console.error("Failed to load tracked products", error);
            }
        };

        void loadTrackedProducts();

        return () => {
            active = false;
        };
    }, [status]);

    const columns = useMemo<MRT_ColumnDef<ProductRow>[]>(
        () => [
            {
                accessorKey: 'title',
                header: 'Product Name',
                size: 320,
                Cell: ({ row }) => {
                    const imageUrl = row.original?.images?.[0]?.src;
                    return (
                        <div className="flex items-center gap-3 py-2">
                            {imageUrl ? (
                                <Image
                                    src={imageUrl}
                                    alt={row.original?.title || "Product"}
                                    width={40}
                                    height={40}
                                    className="h-10 w-10 object-cover rounded shadow-sm border border-white/10"
                                />
                            ) : (
                                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground border border-white/5">
                                    N/A
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="font-medium text-sm leading-tight">
                                    {row.original?.title}
                                </span>
                                {trackedUrls.has(row.original.product_url) && (
                                    <span className="text-[11px] uppercase tracking-[0.18em] text-emerald-300/70">
                                        Tracked
                                    </span>
                                )}
                                <span className="text-xs text-muted-foreground italic">{row.original?.product_type}</span>
                            </div>
                        </div>
                    );
                },
            },
            {
                accessorKey: 'vendor',
                header: 'Vendor',
                size: 150,
                Cell: ({ cell }) => (
                    <span className="text-muted-foreground">{cell.getValue() as string}</span>
                ),
            },
            {
                id: 'price',
                header: 'Price',
                size: 160,
                accessorFn: (row) => {
                    const variants = row.variants || [];
                    if (variants.length === 0) return 0;
                    const prices = variants
                        .map((variant) => parseFloat(variant.price))
                        .filter((price) => !isNaN(price));
                    return prices.length > 0 ? Math.min(...prices) : 0;
                },
                Cell: ({ row }) => {
                    const variants = row.original?.variants || [];
                    if (variants.length <= 1) {
                        const price = variants[0]?.price || 0;
                        return `$${parseFloat(price).toFixed(2)}`;
                    }

                    const prices = variants
                        .map((variant) => parseFloat(variant.price))
                        .filter((price) => !isNaN(price));
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);

                    if (minPrice === maxPrice) return `$${minPrice.toFixed(2)}`;
                    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
                },
            },
            {
                accessorKey: 'product_type',
                header: 'Type',
                size: 150,
            },
            {
                accessorKey: 'created_at',
                header: 'Created',
                size: 190,
                Cell: ({ cell }) => (
                    <span className="text-muted-foreground">
                        {formatDateTime(cell.getValue() as string | undefined)}
                    </span>
                ),
            },
            {
                accessorKey: 'last_updated_at',
                header: 'Last Updated',
                size: 190,
                Cell: ({ cell }) => (
                    <span className="text-muted-foreground">
                        {formatDateTime(cell.getValue() as string | undefined)}
                    </span>
                ),
            },
            {
                id: 'availability',
                header: 'Availability',
                size: 140,
                accessorFn: (row) => {
                    const variants = row.variants || [];
                    if (variants.length === 0) return "N/A";

                    const statuses = new Set(
                        variants.map((variant) => (variant.available ? "In Stock" : "Out of Stock"))
                    );

                    if (statuses.size > 1) return "Mixed";

                    const status = statuses.values().next().value;

                    if (variants.length === 1 && variants[0].inventory_quantity !== undefined) {
                        return variants[0].inventory_quantity > 0 ? variants[0].inventory_quantity : "Out of Stock";
                    }

                    return status;
                },
                Cell: ({ cell }) => {
                    const value = cell.getValue() as string | number;
                    let colorClass = "text-emerald-400/50";

                    if (value === "Mixed") {
                        colorClass = "text-amber-400/60";
                    } else if (value === "Out of Stock" || value === 0) {
                        colorClass = "text-rose-400/50";
                    }

                    return (
                        <span className={`text-sm font-medium ${colorClass}`}>
                            {value}
                        </span>
                    );
                },
                enableColumnFilter: false,
            },
            ...(hasCompetitorColumn
                ? [{
                    accessorKey: "competitor",
                    header: "Competitor",
                    size: 170,
                    Cell: ({ cell }: { cell: { getValue: () => unknown } }) => (
                        <span className="text-muted-foreground">
                            {String(cell.getValue() || "Unknown")}
                        </span>
                    ),
                } satisfies MRT_ColumnDef<ProductRow>]
                : []),
        ],
        [hasCompetitorColumn, trackedUrls]
    );

    function ExtractInformationFromRowsToExport(Rows: MRT_Row<ProductRow>[]) {
        const Result: ExportRow[] = [{ title: "Title", variant: "Variant Name", price: "Price", availablity: "Availablity" }];
        for (let i = 0; i < Rows.length; i++) {
            const Title = Rows[i].original.title;
            const Variants: NormalizedVariant[] = Rows[i].original.variants;
            for (let VariantIndex = 0; VariantIndex < Variants.length; VariantIndex++) {
                const SecondTitle = Rows[i].original.variants[VariantIndex].title;
                const Price = Rows[i].original.variants[VariantIndex].price;
                Result.push({ title: Title, variant: SecondTitle, price: Price, availablity: Rows[i].original.variants[VariantIndex].available == true ? "In Stock" : "Out of Stock" });
            }
        }
        return Result;
    }
    const handleExportRows = (rows: MRT_Row<ProductRow>[]) => {

        const rowData = ExtractInformationFromRowsToExport(rows);//rows.map((row) => {return {title: row.original.title}});
        //console.log({rowData})
        const csv = generateCsv(csvConfig)(rowData);
        download(csvConfig)(csv);
    };

    const handleTrackSelectedRows = async (rows: MRT_Row<ProductRow>[]) => {
        const trackableProducts = rows
            .map((row) => row.original)
            .filter((product) => Boolean(product.product_url))
            .filter((product) => !trackedUrls.has(product.product_url));

        if (trackableProducts.length === 0) {
            return;
        }

        setTrackingSelected(true);

        try {
            await Promise.all(
                trackableProducts.map(async (product) => {
                    const response = await fetch("/api/tracked_products", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            product_url: product.product_url,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to track product: ${product.product_url}`);
                    }
                })
            );

            setTrackedUrls((current) => {
                const next = new Set(current);
                for (const product of trackableProducts) {
                    next.add(product.product_url);
                }
                return next;
            });
        } catch (error) {
            console.error("Failed to track selected products", error);
        } finally {
            setTrackingSelected(false);
        }
    };

    const handleUntrackSelectedRows = async (rows: MRT_Row<ProductRow>[]) => {
        const untrackableProducts = rows
            .map((row) => row.original)
            .filter((product) => Boolean(product.product_url))
            .filter((product) => trackedUrls.has(product.product_url));

        if (untrackableProducts.length === 0) {
            return;
        }

        setTrackingSelected(true);

        try {
            await Promise.all(
                untrackableProducts.map(async (product) => {
                    const response = await fetch("/api/tracked_products", {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            product_url: product.product_url,
                        }),
                    });

                    if (!response.ok) {
                        throw new Error(`Failed to untrack product: ${product.product_url}`);
                    }
                })
            );

            setTrackedUrls((current) => {
                const next = new Set(current);
                for (const product of untrackableProducts) {
                    next.delete(product.product_url);
                }
                return next;
            });
        } catch (error) {
            console.error("Failed to untrack selected products", error);
        } finally {
            setTrackingSelected(false);
        }
    };

    const table = useMantineReactTable({
        columns,
        data: enrichedProducts || [],
        enableExpanding: true,
        enableExpandAll: false,
        enableRowSelection: true,
        getRowId: (row) => row.product_url,
        onRowSelectionChange: setRowSelection,
        /*
        mantineSelectCheckboxProps: ({ row }) => ({
            color: 'gray', // Color based on row data
        }),
        */
        renderTopToolbarCustomActions: ({ table }) => {
            const allRows = table.getPrePaginationRowModel().rows;
            const selectedCount = Object.keys(rowSelection).length;
            const allSelected = allRows.length > 0 && selectedCount === allRows.length;
            const hasSelection = selectedCount > 0;

            return (
                <Box
                    sx={{
                        display: 'flex',
                        gap: '12px',
                        padding: '8px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                    }}
                >
                    <span className="text-sm text-muted-foreground min-w-[96px]">
                        {selectedCount === 0 ? "No rows selected" : `${selectedCount} selected`}
                    </span>
                    {(() => {
                        const selectedRows = table.getSelectedRowModel().rows;
                        const selectedProducts = selectedRows.map((row) => row.original);
                        const allSelectedTracked =
                            selectedProducts.length > 0 &&
                            selectedProducts.every((product) => trackedUrls.has(product.product_url));

                        return (
                            <>
                                <Button
                                    disabled={allRows.length === 0}
                                    onClick={() => {
                                        if (allSelected) {
                                            setRowSelection({});
                                            return;
                                        }

                                        const nextSelection = Object.fromEntries(
                                            allRows.map((row) => [row.id, true])
                                        );
                                        setRowSelection(nextSelection);
                                    }}
                                    variant="outline"
                                >
                                    {allSelected ? "Deselect All Results" : "Select All Results"}
                                </Button>
                                <Button
                                    disabled={
                                        status !== "authenticated" ||
                                        trackingSelected ||
                                        !hasSelection
                                    }
                                    onClick={() =>
                                        allSelectedTracked
                                            ? void handleUntrackSelectedRows(selectedRows)
                                            : void handleTrackSelectedRows(selectedRows)
                                    }
                                >
                                    {trackingSelected
                                        ? "Working..."
                                        : allSelectedTracked
                                            ? "Untrack Selected"
                                            : "Track Selected"}
                                </Button>
                            </>
                        );
                    })()}
                    <Button
                        disabled={!hasSelection}
                        onClick={() => handleExportRows(table.getSelectedRowModel().rows)}
                        variant="outline"
                    >
                        <IconDownload />
                        Export Selected
                    </Button>
                    <Menu position="bottom-end" shadow="md" width={200}>
                        <Menu.Target>
                            <Button
                                disabled={!hasSelection}
                                variant="outline"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            <Menu.Item
                                disabled={
                                    status !== "authenticated" ||
                                    trackingSelected
                                }
                                onClick={() => void handleUntrackSelectedRows(table.getSelectedRowModel().rows)}
                            >
                                Untrack Selected
                            </Menu.Item>
                            <Menu.Item onClick={() => setRowSelection({})}>
                                Clear Selection
                            </Menu.Item>
                        </Menu.Dropdown>
                    </Menu>
                </Box>
            );
        },
        getRowCanExpand: (row) => (row.original.variants?.length || 0) > 1,
        displayColumnDefOptions: {
            'mrt-row-expand': {
                size: 60,
                Cell: ({ row }) => {
                    const variantCount = row.original.variants?.length || 0;
                    if (variantCount <= 1) return null;

                    return (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                row.toggleExpanded();
                            }}
                            style={{
                                cursor: 'pointer',
                                background: 'none',
                                border: 'none',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                color: '#FFFFFF',
                            }}
                        >
                            {row.getIsExpanded() ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                    );
                },
                mantineTableHeadCellProps: {
                    sx: {
                        width: '60px',
                        minWidth: '60px',
                        maxWidth: '60px',
                    }
                },
                mantineTableBodyCellProps: {
                    sx: {
                        width: '60px',
                        minWidth: '60px',
                        maxWidth: '60px',
                    }
                },
            },
        },
        renderDetailPanel: ({ row }) => {
            const variants = row.original.variants || [];
            if (variants.length <= 1) return null;

            return (
                <div className="bg-white/[0.02] px-6 py-3 border-t border-white/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        {variants.map((variant: NormalizedVariant, idx: number) => (
                            <div
                                key={idx}
                                className="p-3 rounded-md border border-white/10 bg-white/[0.02]"
                            >
                                <div className="text-sm font-medium mb-2 truncate">{variant.title}</div>
                                <div className="space-y-1 text-xs text-muted-foreground">
                                    <div>Price: <span className="text-foreground">${parseFloat(variant.price).toFixed(2)}</span></div>
                                    {variant.sku && <div>SKU: <span className="text-foreground font-mono">{variant.sku}</span></div>}
                                    <div>
                                        Stock: {' '}
                                        <span className={
                                            typeof variant.inventory_quantity === 'number'
                                                ? variant.inventory_quantity > 0 ? "text-emerald-400/50" : "text-rose-400/50"
                                                : variant.available ? "text-emerald-400/50" : "text-rose-400/50"
                                        }>
                                            {variant.inventory_quantity ?? (variant.available ? "In Stock" : "Out of Stock")}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        },
        enableColumnActions: true,
        enableHiding: true,
        enableFullScreenToggle: true,
        enableDensityToggle: false,
        enableFilters: true,
        enableColumnFilters: true,
        enableGlobalFilter: false,
        enableSorting: true,
        enablePagination: true,
        enableStickyHeader: true,
        onColumnFiltersChange: setColumnFilters,
        state: {
            columnFilters,
            rowSelection,
        },
        mantineTableContainerProps: {
            sx: {
                maxHeight: '72vh',
                minHeight: '520px',
            },
        },
        initialState: {
            pagination: { pageSize: 5, pageIndex: 0 },
            density: 'xs',
            columnVisibility: {
                product_type: false,
                created_at: false,
                last_updated_at: false,
            },
        },
        mantineTableProps: {
            highlightOnHover: true,
            striped: false,
            verticalSpacing: 'xs',
            horizontalSpacing: 'xs',
            fontSize: 'sm',
            sx: {
                borderCollapse: 'collapse',
                borderSpacing: 0,
            },
        },
        mantineTableBodyRowProps: ({ row }) => ({
            onClick: () => {
                if (row.original?.product_url) {
                    window.open(row.original.product_url, '_blank');
                }
            },
            sx: {
                cursor: 'pointer',
            },
        }),
        mantinePaperProps: {
            sx: {
                backgroundColor: '#0C0C0D',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '0.5rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            },
        },
        mantineTableHeadCellProps: {
            sx: {
                backgroundColor: '#171717',
                color: '#FFFFFF',
                fontSize: '14px',
                fontWeight: 500,
                borderBottom: 'none',
            },
        },
        mantineTableBodyCellProps: {
            sx: {
                color: '#BBBEC9',
                fontSize: '16px',
                borderBottom: 'none',
            },
        },
        mantineTopToolbarProps: {
            sx: {
                backgroundColor: '#0C0C0D',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            },
        },
        mantineBottomToolbarProps: {
            sx: {
                backgroundColor: '#0C0C0D',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
            },
        },
    });
    const globalTheme = useMantineTheme();
    return (
        <div className="w-full mb-12">
            <MantineProvider theme={{ ...globalTheme, primaryColor: 'blue' }}>
                <MantineReactTable table={table} />
            </MantineProvider>
        </div>
    );
};


