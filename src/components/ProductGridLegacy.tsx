// Grid structure taken from ag-grid example from docs:
// https://github.com/ag-grid/ag-grid-demos/blob/main/inventory/react/src/InventoryExample.tsx
// THIS IMPLEMENTATION HAS BEEN DEPRECATED IN FAVOUR OF ./ProductGrid.tsx
// - Yousif

"use client"



import { useMemo, type FC, useCallback } from "react"
import { AgGridReact } from "ag-grid-react"
import { type ColDef, type SizeColumnsToFitGridStrategy, ModuleRegistry, AllCommunityModule, themeQuartz, colorSchemeDark } from "ag-grid-community"
import { MasterDetailModule } from "ag-grid-enterprise"


ModuleRegistry.registerModules([
    AllCommunityModule,
    MasterDetailModule,
]);

// to use myTheme in an application, pass it to the theme grid option
const myTheme = themeQuartz
    .withPart(colorSchemeDark)
    .withParams({
        accentColor: "#15BDE8",
        backgroundColor: "#0C0C0D",
        borderColor: "#ffffff00",
        borderRadius: 20,
        browserColorScheme: "dark",
        cellHorizontalPaddingScale: 1,
        chromeBackgroundColor: {
            ref: "backgroundColor"
        },
        columnBorder: false,
        fontFamily: "Arial, sans-serif",
        fontSize: 16,
        foregroundColor: "#BBBEC9",
        headerBackgroundColor: "#171717",
        headerFontSize: 14,
        headerFontWeight: 500,
        headerTextColor: "#FFFFFF",
        headerVerticalPaddingScale: 0.9,
        iconSize: 20,
        rowBorder: false,
        rowVerticalPaddingScale: 1.2,
        sidePanelBorder: false,
        spacing: 8,
        wrapperBorder: false,
        wrapperBorderRadius: 0
    });

const ProductCellRenderer: FC<any> = (params) => {
    const imageUrl = params.data?.images?.[0]?.src
    return (
        <div className="flex items-center gap-3 py-2">
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={params.data?.title || "Product"}
                    className="h-10 w-10 object-cover rounded shadow-sm border border-white/10"
                />
            ) : (
                <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-[10px] text-muted-foreground border border-white/5">N/A</div>
            )}
            <div className="flex flex-col">
                <span className="font-medium text-sm leading-tight">{params.data?.title}</span>
                <span className="text-xs text-muted-foreground italic">{params.data?.product_type}</span>
            </div>
        </div>
    )
}

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

    const isRowMaster = useCallback((dataItem: any) => {
        return dataItem ? dataItem.variants?.length > 1 : false;
    }, []);

    const columnDefs = useMemo<ColDef[]>(
        () => [
            {
                field: "title",
                headerName: "Product Name",
                flex: 3,
                filter: "agTextColumnFilter",
                floatingFilter: true,
                cellRenderer: "agGroupCellRenderer",
                cellRendererParams: {
                    innerRenderer: ProductCellRenderer,
                },
                minWidth: 320,
            },
            {
                field: "vendor",
                headerName: "Vendor",
                flex: 1,
                filter: "agTextColumnFilter",
                floatingFilter: true,
                cellClass: "text-muted-foreground"
            },
            {
                field: "variants",
                headerName: "Price",
                valueGetter: (params: any) => {
                    const variants = params.data?.variants || [];
                    if (variants.length === 0) return 0;
                    const prices = variants.map((v: any) => parseFloat(v.price)).filter((p: any) => !isNaN(p));
                    return prices.length > 0 ? Math.min(...prices) : 0;
                },
                valueFormatter: (params: any) => {
                    const variants = params.data?.variants || [];
                    if (variants.length <= 1) return `$${params.value?.toFixed(2) || "0.00"}`;

                    const prices = variants.map((v: any) => parseFloat(v.price)).filter((p: any) => !isNaN(p));
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);

                    if (minPrice === maxPrice) return `$${minPrice.toFixed(2)}`;
                    return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
                },
                width: 160,
                filter: "agNumberColumnFilter",
                floatingFilter: true,
            },
            {
                field: "product_type",
                headerName: "Type",
                flex: 1,
                filter: "agTextColumnFilter",
                floatingFilter: true,
            },
            {
                headerName: "Availability",
                width: 140,
                valueGetter: (params: any) => {
                    const variants = params.data?.variants || [];
                    if (variants.length === 0) return "N/A";

                    const statuses = new Set(variants.map((v: any) => v.available ? "In Stock" : "Out of Stock"));

                    // Only show "Mixed" if availability actually differs among variants
                    if (statuses.size > 1) return "Mixed";

                    // If all variants have the same status, show that status
                    const status = statuses.values().next().value;

                    // For single variant products, show actual stock level if available
                    if (variants.length === 1 && variants[0].inventory_quantity !== undefined) {
                        return variants[0].inventory_quantity > 0 ? variants[0].inventory_quantity : "Out of Stock";
                    }

                    return status;
                },
                cellRenderer: (params: any) => {
                    const value = params.value;
                    let colorClass = "text-emerald-400/50";

                    if (value === "Mixed") {
                        colorClass = "text-amber-400/60";
                    } else if (value === "Out of Stock" || value === 0) {
                        colorClass = "text-rose-400/50";
                    }

                    return (
                        <div className="flex items-center h-full">
                            <span className={`text-sm font-medium ${colorClass}`}>
                                {value}
                            </span>
                        </div>
                    );
                },
                filter: false,
            },
        ],
        []
    )

    const detailCellRendererParams = useMemo(() => {
        return {
            detailGridOptions: {
                columnDefs: [
                    { field: 'title', headerName: 'Variant', flex: 2 },
                    {
                        field: 'price',
                        headerName: 'Price',
                        width: 120,
                        valueFormatter: (params: any) => `$${parseFloat(params.value).toFixed(2)}`
                    },
                    { field: 'sku', headerName: 'SKU', flex: 1 },
                    {
                        field: 'inventory_quantity',
                        headerName: 'Inventory',
                        width: 120,
                        valueGetter: (params: any) => {
                            // Shopify sometimes uses inventory_quantity, sometimes available
                            return params.data.inventory_quantity ?? (params.data.available ? "In Stock" : "Out of Stock");
                        },
                        cellClass: (params: any) => {
                            if (typeof params.value === 'number') {
                                return params.value > 0 ? "text-emerald-400/50" : "text-rose-400/50";
                            }
                            return params.value === "In Stock" ? "text-emerald-400/50" : "text-rose-400/50";
                        }
                    }
                ],
                defaultColDef: {
                    flex: 1,
                    sortable: true,
                    resizable: true,
                },
                headerHeight: 40,
            },
            getDetailRowData: (params: any) => {
                params.successCallback(params.data.variants);
            },
        };
    }, []);

    const defaultColDef = useMemo<ColDef>(
        () => ({
            resizable: true,
            sortable: true,
            filter: true,
        }),
        []
    )

    const autoSizeStrategy = useMemo<SizeColumnsToFitGridStrategy>(
        () => ({
            type: "fitGridWidth",
        }),
        []
    )

    return (
        <div className="h-[600px] w-full rounded-lg overflow-hidden border border-white/10 shadow-2xl [&_.ag-row]:cursor-pointer">
            <AgGridReact
                theme={myTheme}
                columnDefs={columnDefs}
                rowData={enrichedProducts}
                defaultColDef={defaultColDef}
                autoSizeStrategy={autoSizeStrategy}
                pagination
                paginationPageSize={20}
                paginationPageSizeSelector={[10, 20, 50, 100]}
                rowHeight={70}
                animateRows
                domLayout="normal"
                masterDetail={true}
                isRowMaster={isRowMaster}
                detailCellRendererParams={detailCellRendererParams}
                detailRowHeight={250}
                onRowClicked={(params) => {
                    if (params.data?.product_url) {
                        window.open(params.data.product_url, '_blank');
                    }
                }}
            />
        </div>
    )
}
