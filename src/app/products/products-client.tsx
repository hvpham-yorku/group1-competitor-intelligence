"use client"

import * as React from "react"
import { ProductGrid } from "@/components/ProductGrid"
import { SearchBar } from "@/components/SearchBar"
import { Loader2 } from "lucide-react"
import type { ProductSearchResult } from "@/services/products/search-types"
import type { NormalizedProduct } from "@/services/scraper/normalized-types"

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
    const [products, setProducts] = React.useState<Array<NormalizedProduct & { competitor: string }>>([])
    const [query, setQuery] = React.useState("")

    const fetchData = React.useCallback(async (nextQuery: string) => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (nextQuery.trim()) {
                params.set("q", nextQuery.trim())
                params.set("limit", "60")
            } else {
                params.set("limit", "24")
            }

            const res = await fetch(`/api/products/search?${params.toString()}`, { cache: "no-store" })
            if (!res.ok) {
                throw new Error("Failed to search products")
            }

            const data = await res.json() as ProductSearchResult[]
            setProducts(data.map(mapSearchResultToProduct))
        } catch (error) {
            console.error("Failed to fetch products", error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void fetchData(query)
        }, 250)

        return () => window.clearTimeout(timeoutId)
    }, [fetchData, query])

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="max-w-md w-full">
                    <SearchBar
                        placeholder="Search all products..."
                        value={query}
                        onChange={setQuery}
                        onSubmit={(e) => e.preventDefault()}
                    />
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {query.trim() ? "Live product search" : "Recent products across your stores"}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                    <p className="text-sm">Consolidating competitor catalogs...</p>
                </div>
            ) : (
                <ProductGrid
                    products={products}
                    showCompetitor={true}
                />
            )}
        </div>
    )
}
