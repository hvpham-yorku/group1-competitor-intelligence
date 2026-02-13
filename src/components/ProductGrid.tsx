// This file implementation is a migration from ./ProductGrid.tsx from ag-grid to MantineTable (using tanstack table)
// An LLM (claude opus 4.6) was used to perform the migration, given context of the legacy grid, as well as mantinetable docs
// prompt: given the context, perform a migration with the exact functionality of the previous implementation
// further edits were made regarding styling and row expansion behaviour
// - Yousif

"use client"

import { useMemo, type FC } from "react"
import { MantineReactTable, type MRT_ColumnDef, useMantineReactTable } from "mantine-react-table"
import { MantineProvider } from "@mantine/core"
import { ChevronRight, ChevronDown } from "lucide-react"


interface ProductGridProps {
    products: any[];
    sourceUrl?: string;
}

export const ProductGrid: FC<ProductGridProps> = ({ products, sourceUrl }) => {
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

    const columns = useMemo<MRT_ColumnDef<any>[]>(
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
                                <img
                                    src={imageUrl}
                                    alt={row.original?.title || "Product"}
                                    className="h-10 w-10 object-cover rounded shadow-sm border border-white/10"
                                />
                            ) : (
                                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground border border-white/5">
                                    N/A
                                </div>
                            )}
                            <div className="flex flex-col">
                                <span className="font-medium text-sm leading-tight">{row.original?.title}</span>
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
                    const prices = variants.map((v: any) => parseFloat(v.price)).filter((p: any) => !isNaN(p));
                    return prices.length > 0 ? Math.min(...prices) : 0;
                },
                Cell: ({ row }) => {
                    const variants = row.original?.variants || [];
                    if (variants.length <= 1) {
                        const price = variants[0]?.price || 0;
                        return `$${parseFloat(price).toFixed(2)}`;
                    }

                    const prices = variants.map((v: any) => parseFloat(v.price)).filter((p: any) => !isNaN(p));
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);

                    if (minPrice === maxPrice) return `$${minPrice.toFixed(2)}`;
                    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
                },
                filterVariant: 'range',
            },
            {
                accessorKey: 'product_type',
                header: 'Type',
                size: 150,
            },
            {
                id: 'availability',
                header: 'Availability',
                size: 140,
                accessorFn: (row) => {
                    const variants = row.variants || [];
                    if (variants.length === 0) return "N/A";

                    const statuses = new Set(variants.map((v: any) => v.available ? "In Stock" : "Out of Stock"));

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
        ],
        []
    );

    const table = useMantineReactTable({
        columns,
        data: enrichedProducts,
        enableExpanding: true,
        enableExpandAll: false,
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
                        {variants.map((variant: any, idx: number) => (
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
        enableColumnFilters: true,
        enableFilters: true,
        enableSorting: true,
        enablePagination: true,
        enableStickyHeader: true,
        mantineTableContainerProps: {
            sx: {
                maxHeight: '500px',
            },
        },
        initialState: {
            pagination: { pageSize: 20, pageIndex: 0 },
            density: 'xs',
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

    return (
        <MantineProvider
            withGlobalStyles
            withNormalizeCSS
            theme={{
                colorScheme: 'dark',
                primaryColor: 'cyan',
            }}
        >
            <div className="h-[600px] w-full mb-12">
                <MantineReactTable table={table} />
            </div>
        </MantineProvider>
    );
};
