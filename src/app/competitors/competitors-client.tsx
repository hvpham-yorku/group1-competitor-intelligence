"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Menu } from "@mantine/core"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, ExternalLink, MoreHorizontal, Package } from "lucide-react"
import { CompetitorDetailView } from "@/app/competitors/competitor-detail-view"
import {
    getPlatformBadgeLabel,
    SiteProduct,
    SiteSummary,
} from "@/app/competitors/analytics-utils"

type TrackedStoreSummary = {
    store_domain: string
    is_owned_store: boolean
}

export function CompetitorsClient() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [loading, setLoading] = React.useState(true)
    const [sites, setSites] = React.useState<SiteSummary[]>([])
    const [selectedSite, setSelectedSite] = React.useState<SiteSummary | null>(null)
    const [trackedStoreDomains, setTrackedStoreDomains] = React.useState<Set<string>>(new Set())
    const [ownedStoreDomains, setOwnedStoreDomains] = React.useState<Set<string>>(new Set())
    const [workingDomain, setWorkingDomain] = React.useState<string | null>(null)

    const selectedSiteDomain = React.useMemo(
        () => normalizeSiteDomain(searchParams.get("site") || ""),
        [searchParams]
    )

    React.useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const [sitesResponse, trackedResponse] = await Promise.all([
                    fetch("/api/scrapes/sites?pageSize=20"),
                    fetch("/api/tracked_products", { cache: "no-store" }),
                ])

                const sitesData = (await sitesResponse.json()) as { sites?: SiteSummary[] }
                setSites(Array.isArray(sitesData.sites) ? sitesData.sites : [])

                if (trackedResponse.ok) {
                    const trackedData = (await trackedResponse.json()) as { stores?: TrackedStoreSummary[] }
                    const trackedDomains = new Set(
                        (trackedData.stores || []).map((store) => normalizeSiteDomain(store.store_domain))
                    )
                    const ownedDomains = new Set(
                        (trackedData.stores || [])
                            .filter((store) => store.is_owned_store)
                            .map((store) => normalizeSiteDomain(store.store_domain))
                    )
                    setTrackedStoreDomains(trackedDomains)
                    setOwnedStoreDomains(ownedDomains)
                }
            } catch (error) {
                console.error("Failed to fetch competitor data", error)
            } finally {
                setLoading(false)
            }
        }

        void fetchData()
    }, [])

    React.useEffect(() => {
        if (!selectedSiteDomain || sites.length === 0) {
            return
        }

        const matchedSite = sites.find((site) => normalizeSiteDomain(site.url) === selectedSiteDomain)
        if (matchedSite) {
            setSelectedSite(matchedSite)
        }
    }, [selectedSiteDomain, sites])

    const updateTrackedStore = async (site: SiteSummary, action: "toggle" | "own") => {
        const domain = normalizeSiteDomain(site.url)
        if (!domain) {
            return
        }

        setWorkingDomain(domain)
        try {
            const response = await fetch("/api/tracked_products", {
                method: action === "toggle" && trackedStoreDomains.has(domain) ? "DELETE" : "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    track_type: "store",
                    store_url: domain,
                    is_owned_store: action === "own",
                }),
            })

            if (!response.ok) {
                throw new Error("Failed to update tracked store")
            }

            setTrackedStoreDomains((current) => {
                const next = new Set(current)
                if (action === "toggle" && next.has(domain)) {
                    next.delete(domain)
                } else {
                    next.add(domain)
                }
                return next
            })

            if (action === "own") {
                setOwnedStoreDomains(new Set([domain]))
                setTrackedStoreDomains((current) => new Set(current).add(domain))
            } else if (trackedStoreDomains.has(domain) && ownedStoreDomains.has(domain)) {
                setOwnedStoreDomains((current) => {
                    const next = new Set(current)
                    next.delete(domain)
                    return next
                })
            }
        } catch (error) {
            console.error("Failed to update store tracking", error)
        } finally {
            setWorkingDomain(null)
        }
    }

    const deleteCompetitor = async (site: SiteSummary) => {
        const domain = normalizeSiteDomain(site.url)
        if (!domain || workingDomain) {
            return
        }

        const confirmed = window.confirm(
            `Delete all saved data for ${domain}? This removes the competitor from your history and tracking.`
        )
        if (!confirmed) {
            return
        }

        setWorkingDomain(domain)
        try {
            const response = await fetch(
                `/api/scrapes/site?url=${encodeURIComponent(domain)}&scope=all`,
                { method: "DELETE" }
            )

            if (!response.ok) {
                throw new Error("Failed to delete competitor")
            }

            setSites((current) => current.filter((entry) => normalizeSiteDomain(entry.url) !== domain))
            setTrackedStoreDomains((current) => {
                const next = new Set(current)
                next.delete(domain)
                return next
            })
            setOwnedStoreDomains((current) => {
                const next = new Set(current)
                next.delete(domain)
                return next
            })

            if (selectedSite && normalizeSiteDomain(selectedSite.url) === domain) {
                setSelectedSite(null)
                router.replace("/competitors")
            }
        } catch (error) {
            console.error("Failed to delete competitor", error)
        } finally {
            setWorkingDomain(null)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
                <p className="text-sm">Analyzing competitor benchmarks...</p>
            </div>
        )
    }

    if (selectedSite) {
        const domain = normalizeSiteDomain(selectedSite.url)
        return (
            <CompetitorDetailView
                site={selectedSite}
                onBack={() => {
                    setSelectedSite(null)
                    router.replace("/competitors")
                }}
                isTrackedStore={trackedStoreDomains.has(domain)}
                isOwnedStore={ownedStoreDomains.has(domain)}
                trackingBusy={workingDomain === domain}
                onToggleTrackedStore={() => void updateTrackedStore(selectedSite, "toggle")}
                onSetOwnedStore={() => void updateTrackedStore(selectedSite, "own")}
                onDeleteSite={() => void deleteCompetitor(selectedSite)}
            />
        )
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
                const siteDomain = normalizeSiteDomain(site.url)
                const isTrackedStore = trackedStoreDomains.has(siteDomain)
                const isOwnedStore = ownedStoreDomains.has(siteDomain)
                const isBusy = workingDomain === siteDomain

                return (
                    <div key={site.url} className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md">
                        <div className="p-6">
                            <div className="mb-4 flex items-center justify-between gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                                    {siteName.charAt(0).toUpperCase()}
                                </div>
                                <div className="ml-auto flex items-center gap-2 self-start">
                                    {isOwnedStore ? <Badge>My Store</Badge> : null}
                                    <Badge variant="secondary" className="font-mono text-xs">
                                        {platformLabel}
                                    </Badge>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8"
                                        disabled={isBusy}
                                        onClick={() => void updateTrackedStore(site, "toggle")}
                                    >
                                        {isBusy ? "Working..." : isTrackedStore ? "Untrack Store" : "Track Store"}
                                    </Button>
                                    <Menu position="bottom-end" shadow="md" width={220}>
                                        <Menu.Target>
                                            <Button className="h-8 w-8 self-center p-0" size="sm" variant="outline">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </Menu.Target>
                                        <Menu.Dropdown>
                                            <Menu.Item
                                                disabled={isBusy || isOwnedStore}
                                                onClick={() => void updateTrackedStore(site, "own")}
                                            >
                                                {isOwnedStore ? "Current My Store" : "Set As My Store"}
                                            </Menu.Item>
                                            <Menu.Item
                                                color="red"
                                                disabled={isBusy}
                                                onClick={() => void deleteCompetitor(site)}
                                            >
                                                Delete Competitor
                                            </Menu.Item>
                                        </Menu.Dropdown>
                                    </Menu>
                                </div>
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

                        <div className="bg-muted/30 p-4">
                            <Button
                                className="w-full gap-2"
                                variant="default"
                                onClick={() => {
                                    setSelectedSite(site)
                                    router.replace(`/competitors?site=${encodeURIComponent(siteDomain)}`)
                                }}
                            >
                                View Details
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

function normalizeSiteDomain(input: string) {
    return input.replace(/^https?:\/\//, "").replace(/\/+$/, "").split("/")[0].toLowerCase()
}
