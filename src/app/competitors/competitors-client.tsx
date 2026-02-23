"use client"

import * as React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, Package } from "lucide-react"
import { ProductGrid } from "@/components/ProductGrid"

type SiteProduct = {
    variants?: Array<{ price?: string }>
    platform?: string
    raw?: Record<string, unknown>
    product_url?: string
}

type SiteSummary = {
    url: string
    latestRun?: {
        created_at?: string
        products?: SiteProduct[]
    }
}

function getPlatformBadgeLabel(products: unknown[]): string {
    const first = products[0]
    const firstRecord = first && typeof first === "object" ? (first as Record<string, unknown>) : {}

    const directPlatform = firstRecord.platform
    if (typeof directPlatform === "string" && directPlatform.trim().length > 0) {
        return directPlatform.toUpperCase()
    }

    const raw = firstRecord.raw && typeof firstRecord.raw === "object"
        ? (firstRecord.raw as Record<string, unknown>)
        : {}

    if (raw.prices) {
        return "WOOCOMMERCE"
    }

    const productUrl = typeof firstRecord.product_url === "string" ? firstRecord.product_url : ""
    if (productUrl.includes("/products/")) {
        return "SHOPIFY"
    }
    if (productUrl.includes("/product/") || productUrl.includes("/shop/")) {
        return "WOOCOMMERCE"
    }

    return "UNKNOWN"
}

export function CompetitorsClient() {
    const [loading, setLoading] = React.useState(true)
    const [sites, setSites] = React.useState<SiteSummary[]>([])
    const [selectedSite, setSelectedSite] = React.useState<SiteSummary | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/scrapes/sites?pageSize=20")
            const data = (await res.json()) as { sites?: SiteSummary[] }
            setSites(Array.isArray(data.sites) ? data.sites : [])
        } catch (error) {
            console.error("Failed to fetch sites", error)
        } finally {
            setLoading(false)
        }
    }

    React.useEffect(() => {
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="text-sm">Analyzing competitor benchmarks...</p>
            </div>
        )
    }

    //show product grid if a competitor is selected
    if (selectedSite) {
        const products = selectedSite.latestRun?.products || []
        const siteName = selectedSite.url.replace(/^https?:\/\//, '').split('/')[0]

        return (
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {siteName}
                            <Badge variant="outline" className="ml-2">
                                {products.length} products
                            </Badge>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                            Last synced {selectedSite.latestRun?.created_at ? new Date(selectedSite.latestRun.created_at).toLocaleDateString() : 'Never'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => setSelectedSite(null)}>
                            Back to list
                        </Button>
                        <Button variant="outline" asChild>
                            <a href={selectedSite.url.startsWith('http') ? selectedSite.url : `https://${selectedSite.url}`} target="_blank" rel="noopener noreferrer" className="gap-2">
                                Visit Store <ExternalLink className="h-4 w-4" />
                            </a>
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardContent className="p-0">
                        <ProductGrid
                            products={products}
                            showCompetitor={false}
                        />
                    </CardContent>
                </Card>
            </div>
        )
    }

    //show competitor list once fetched
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => {
                const productCount = site.latestRun?.products?.length || 0
                const products = site.latestRun?.products || []
                const platformLabel = getPlatformBadgeLabel(products)

                
                let avgPrice = 0

                if (productCount > 0) {
                    const totalValue = products.reduce((acc: number, p: SiteProduct) => {
                        const price = parseFloat(p.variants?.[0]?.price || "0")
                        return acc + price
                    }, 0)
                    avgPrice = totalValue / productCount
                }

                const siteName = site.url.replace(/^https?:\/\//, '').split('/')[0]
                const properUrl = site.url.startsWith('http') ? site.url : `https://${site.url}`

                return (
                    <div key={site.url} className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm hover:shadow-md transition-all">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                    {siteName.charAt(0).toUpperCase()}
                                </div>
                                <Badge variant="secondary" className="font-mono text-xs">
                                    {platformLabel}
                                </Badge>
                            </div>

                            <h3 className="font-semibold text-lg mb-1 truncate" title={siteName}>{siteName}</h3>
                            <a href={properUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-6 truncate">
                                {site.url.replace(/^https?:\/\//, '')}
                                <ExternalLink className="h-3 w-3" />
                            </a>

                            <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-border/50">
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Products</div>
                                    <div className="text-2xl font-bold flex items-center gap-2">
                                        {productCount}
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Avg Price</div>
                                    <div className="text-2xl font-bold">
                                        ${avgPrice.toFixed(0)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-muted/30 flex items-center gap-3">
                            <Button className="w-full gap-2" variant="default" onClick={() => setSelectedSite(site)}>
                                View Products
                            </Button>
                        </div>
                    </div>
                )
            })}

            {/* emptystate */}
            {sites.length === 0 && (
                <div className="col-span-full py-20 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Package className="h-10 w-10 opacity-20" />
                    <p className="text-lg font-medium">No competitors found</p>
                    <p className="text-sm">Start by tracking a store URL in the dashboard.</p>
                </div>
            )}
        </div>
    )
}
