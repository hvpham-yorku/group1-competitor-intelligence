"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, Package } from "lucide-react"
import { CompetitorDetailView } from "@/app/competitors/competitor-detail-view"
import {
    getPlatformBadgeLabel,
    SiteProduct,
    SiteSummary,
} from "@/app/competitors/analytics-utils"

export function CompetitorsClient() {
    const [loading, setLoading] = React.useState(true)
    const [sites, setSites] = React.useState<SiteSummary[]>([])
    const [selectedSite, setSelectedSite] = React.useState<SiteSummary | null>(null)

    React.useEffect(() => {
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

        void fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="text-sm">Analyzing competitor benchmarks...</p>
            </div>
        )
    }

    if (selectedSite) {
        return <CompetitorDetailView site={selectedSite} onBack={() => setSelectedSite(null)} />
    }

    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sites.map((site) => {
                const products = site.latestRun?.products || []
                const productCount = products.length
                const platformLabel = getPlatformBadgeLabel(products)
                const avgPrice = getAveragePrice(products)
                const siteName = site.url.replace(/^https?:\/\//, "").split("/")[0]
                const properUrl = site.url.startsWith("http") ? site.url : `https://${site.url}`

                return (
                    <div key={site.url} className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
                        <div className="p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                                    {siteName.charAt(0).toUpperCase()}
                                </div>
                                <Badge variant="secondary" className="font-mono text-xs">
                                    {platformLabel}
                                </Badge>
                            </div>

                            <h3 className="mb-1 truncate text-lg font-semibold" title={siteName}>
                                {siteName}
                            </h3>
                            <a
                                href={properUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mb-6 flex truncate items-center gap-1 text-sm text-muted-foreground hover:text-primary"
                            >
                                {site.url.replace(/^https?:\/\//, "")}
                                <ExternalLink className="h-3 w-3" />
                            </a>

                            <div className="grid grid-cols-2 gap-4 border-b border-t border-border/50 py-4">
                                <div>
                                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Products</div>
                                    <div className="flex items-center gap-2 text-2xl font-bold">
                                        {productCount}
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                </div>
                                <div>
                                    <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">Avg Price</div>
                                    <div className="text-2xl font-bold">${avgPrice.toFixed(0)}</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 bg-muted/30 p-4">
                            <Button className="w-full gap-2" variant="default" onClick={() => setSelectedSite(site)}>
                                View Products
                            </Button>
                        </div>
                    </div>
                )
            })}

            {sites.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-20 text-muted-foreground">
                    <Package className="h-10 w-10 opacity-20" />
                    <p className="text-lg font-medium">No competitors found</p>
                    <p className="text-sm">Start by tracking a store URL in the dashboard.</p>
                </div>
            )}
        </div>
    )
}

function getAveragePrice(products: SiteProduct[]) {
    if (products.length === 0) {
        return 0
    }

    const totalValue = products.reduce((acc: number, product: SiteProduct) => {
        const price = Number.parseFloat(product.variants?.[0]?.price || "0")
        return acc + price
    }, 0)

    return totalValue / products.length
}
