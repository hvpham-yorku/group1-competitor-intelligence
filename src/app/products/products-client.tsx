"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { ProductGrid } from "@/components/ProductGrid"
import { SearchBar } from "@/components/SearchBar"
import type { ProductSearchPage, ProductSearchResult } from "@/services/products/search-types"
import type { NormalizedProduct } from "@/services/scraper/normalized-types"
import type { MRT_PaginationState } from "mantine-react-table"

function mapSearchResultToProduct(result: ProductSearchResult): NormalizedProduct & { competitor: string } {
    return {
        source_product_id: result.source_product_id,
        title: result.title,
        vendor: result.vendor ?? undefined,
        product_type: result.product_type ?? undefined,
        product_url: result.product_url,
        images: result.images,
        last_updated_at: result.latest_observed_at ?? undefined,
        variants: result.latest_price != null ? [
            {
                title: result.title,
                price: String(result.latest_price),
                available: result.latest_available ?? undefined,
                inventory_quantity: result.latest_inventory_quantity ?? undefined,
                product_url: result.product_url,
                observed_at: result.latest_observed_at ?? undefined,
            }
        ] : [],
        competitor: result.store_domain,
    }
}

export function ProductsClient() {
    const [loading, setLoading] = React.useState(true)
    const [fetching, setFetching] = React.useState(false)
    const [products, setProducts] = React.useState<Array<NormalizedProduct & { competitor: string }>>([])
    const [query, setQuery] = React.useState("")
    const [total, setTotal] = React.useState(0)
    const [pagination, setPagination] = React.useState<MRT_PaginationState>({ pageIndex: 0, pageSize: 20 })

    const fetchData = React.useCallback(async (nextQuery: string, nextPagination: MRT_PaginationState) => {
        if (products.length === 0 && total === 0) {
            setLoading(true)
        } else {
            setFetching(true)
        }
        try {
            const params = new URLSearchParams()
            if (nextQuery.trim()) {
                params.set("q", nextQuery.trim())
            }
            params.set("page", String(nextPagination.pageIndex + 1))
            params.set("limit", String(nextPagination.pageSize))

            const res = await fetch(`/api/products/search?${params.toString()}`, { cache: "no-store" })
            if (!res.ok) {
                throw new Error("Failed to search products")
            }

            const data = await res.json() as ProductSearchPage
            setProducts(data.items.map(mapSearchResultToProduct))
            setTotal(data.total)
        } catch (error) {
            console.error("Failed to fetch products", error)
        } finally {
            setLoading(false)
            setFetching(false)
        }
    }, [products.length, total])

    React.useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchData(query, pagination)
        }, 250)

        return () => window.clearTimeout(timeoutId)
    }, [fetchData, pagination, query])

    return (
        <div className="flex flex-col gap-6">
            <div className="max-w-md w-full">
                <SearchBar
                    placeholder="Search all products..."
                    value={query}
                    onChange={(value) => {
                        setQuery(value)
                        setPagination((current) => ({ ...current, pageIndex: 0 }))
                    }}
                    onSubmit={(e) => e.preventDefault()}
                />
            </div>

            {loading && products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                    <p className="text-sm">Loading products...</p>
                </div>
            ) : (
                <>
                    <ProductGrid
                        products={products}
                        showCompetitor={true}
                        enablePagination={true}
                        enableColumnFilters={false}
                        manualPagination={true}
                        rowCount={total}
                        pagination={pagination}
                        onPaginationChange={setPagination}
                        rowsPerPageOptions={["20", "40", "80"]}
                        isFetching={fetching}
                    />
                </>
            )}
        </div>
    )
}
