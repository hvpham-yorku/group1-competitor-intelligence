"use client"

import * as React from "react"
import { ProductGrid } from "@/components/ProductGrid"
import { SearchBar } from "@/components/SearchBar"
import { Loader2 } from "lucide-react"

export function ProductsClient() {
    const [loading, setLoading] = React.useState(true)
    const [products, setProducts] = React.useState<any[]>([])
    const [query, setQuery] = React.useState("")

    const fetchData = async () => {
        setLoading(true)
        try {
            // Fetch all products using the sites endpoint
            const res = await fetch("/api/scrapes/sites?pageSize=50")
            const data = await res.json()

            const allProducts: any[] = []

            if (data.sites) {
                data.sites.forEach((site: any) => {
                    if (site.latestRun && site.latestRun.products) {
                        site.latestRun.products.forEach((p: any) => {
                            allProducts.push({
                                ...p,
                                competitor: site.url.replace(/^https?:\/\//, '').split('/')[0]
                            })
                        })
                    }
                })
            }

            setProducts(allProducts)
        } catch (error) {
            console.error("Failed to fetch products", error)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchData()
    }, [])

    const filteredProducts = products.filter(p =>
        p.title?.toLowerCase().includes(query.toLowerCase()) ||
        p.vendor?.toLowerCase().includes(query.toLowerCase())
    )

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
                    Aggregated from all active competitors
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                    <p className="text-sm">Consolidating competitor catalogs...</p>
                </div>
            ) : (
                <ProductGrid
                    products={filteredProducts}
                    showCompetitor={true}
                />
            )}
        </div>
    )
}
