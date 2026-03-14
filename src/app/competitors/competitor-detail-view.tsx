"use client"

import * as React from "react"
import { RangeSlider } from "@mantine/core"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { ExternalLink, TrendingUp, Scale, ChartScatter, History, Sparkles } from "lucide-react"
import { ProductGrid } from "@/components/ProductGrid"
import {
    Area,
    AreaChart,
    CartesianGrid,
    Line,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts"
import {
    buildProductAnalytics,
    formatPrice,
    getPriceBand,
    getProductPrice,
    PricePoint,
    SiteSummary,
} from "@/app/competitors/analytics-utils"
import { LatestProductsList } from "@/app/competitors/latest-products-list"

function AnalyticsTooltip({
    active,
    payload,
}: {
    active?: boolean
    payload?: Array<{ payload: PricePoint }>
}) {
    if (!active || !payload?.length) {
        return null
    }

    const point = payload[0].payload
    return (
        <div className="rounded-md border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs shadow-lg">
            <div className="font-medium text-white">{point.label}</div>
            <div className="text-zinc-400">{point.count} products in this band</div>
        </div>
    )
}

function CumulativeTooltip({
    active,
    payload,
    label,
}: {
    active?: boolean
    payload?: Array<{ value?: number }>
    label?: number | string
}) {
    if (!active || !payload?.length) {
        return null
    }

    const coverage = typeof payload[0]?.value === "number" ? payload[0].value : 0

    return (
        <div className="rounded-md border border-white/10 bg-zinc-950/95 px-3 py-2 text-xs shadow-lg">
            <div className="font-medium text-white">Up to {Math.round(Number(label))}</div>
            <div className="text-zinc-400">{Math.round(coverage * 100)}% coverage</div>
        </div>
    )
}

export function CompetitorDetailView({
    site,
    onBack,
}: {
    site: SiteSummary
    onBack: () => void
}) {
    const [filterMode, setFilterMode] = React.useState<"range" | "band">("range")
    const [selectedPriceBand, setSelectedPriceBand] = React.useState<number | null>(null)
    const [priceWindow, setPriceWindow] = React.useState<[number, number] | null>(null)
    const [sliderWindow, setSliderWindow] = React.useState<[number, number] | null>(null)
    const [binSizeInput, setBinSizeInput] = React.useState("1")

    const products = React.useMemo(() => site.latestRun?.products || [], [site.latestRun?.products])
    const siteName = site.url.replace(/^https?:\/\//, "").split("/")[0]
    const binSize = Math.max(1, Number.parseInt(binSizeInput || "1", 10) || 1)
    const analytics = React.useMemo(() => buildProductAnalytics(products, binSize), [products, binSize])
    const bandValues = React.useMemo(() => analytics.scatterData.map((point) => point.band), [analytics.scatterData])
    const fullSliderWindow = React.useMemo<[number, number] | null>(
        () => (bandValues.length > 0 ? [0, bandValues.length - 1] : null),
        [bandValues]
    )
    const fullPriceWindow = React.useMemo(
        () =>
            analytics.scatterData.length > 0
                ? ([analytics.scatterData[0].band, analytics.scatterData[analytics.scatterData.length - 1].band] as [number, number])
                : null,
        [analytics.scatterData]
    )
    const activeSliderWindow = sliderWindow ?? fullSliderWindow
    const sliderStartIndex = activeSliderWindow ? Math.max(0, Math.floor(activeSliderWindow[0])) : 0
    const sliderEndIndex = activeSliderWindow ? Math.min(bandValues.length - 1, Math.ceil(activeSliderWindow[1])) : bandValues.length - 1
    const livePriceWindow =
        bandValues.length > 0
            ? ([bandValues[sliderStartIndex], bandValues[sliderEndIndex]] as [number, number])
            : null
    const activePriceWindow = priceWindow ?? fullPriceWindow
    const visibleScatterData = (filterMode === "range" ? livePriceWindow : activePriceWindow)
        ? analytics.scatterData.filter(
            (point) =>
                point.band >= (filterMode === "range" ? livePriceWindow?.[0] ?? 0 : activePriceWindow?.[0] ?? 0) &&
                point.band <= (filterMode === "range" ? livePriceWindow?.[1] ?? 0 : activePriceWindow?.[1] ?? 0)
        )
        : analytics.scatterData
    const activeChartData =
        filterMode === "band" && selectedPriceBand != null
            ? visibleScatterData.filter((point) => point.band === selectedPriceBand)
            : visibleScatterData
    const visibleMinPrice = visibleScatterData[0]?.price ?? null
    const visibleMaxPrice = visibleScatterData[visibleScatterData.length - 1]?.price ?? null

    React.useEffect(() => {
        setFilterMode("range")
        setSelectedPriceBand(null)
        setPriceWindow(fullPriceWindow)
        setSliderWindow(fullSliderWindow)
    }, [site.url, binSize, fullPriceWindow, fullSliderWindow])

    const filteredProducts = products.filter((product) => {
        const price = getProductPrice(product)

        if (filterMode === "band" && selectedPriceBand != null) {
            if (price == null) {
                return false
            }

            return getPriceBand(price, binSize) === selectedPriceBand
        }

        if (filterMode === "range" && priceWindow && visibleMinPrice != null && visibleMaxPrice != null) {
            const priceBand = price != null ? getPriceBand(price, binSize) : null
            return priceBand != null && priceBand >= visibleMinPrice && priceBand <= visibleMaxPrice
        }

        return true
    })

    const isFiltered =
        (filterMode === "band" && selectedPriceBand != null) ||
        (filterMode === "range" && priceWindow != null)

    const resetFilters = () => {
        setFilterMode("range")
        setSelectedPriceBand(null)
        setPriceWindow(fullPriceWindow)
        setSliderWindow(fullSliderWindow)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                        {siteName}
                        <Badge variant="outline" className="ml-2">
                            {products.length} products
                        </Badge>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Last synced {site.latestRun?.created_at ? new Date(site.latestRun.created_at).toLocaleDateString() : "Never"}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={onBack}>
                        Back to list
                    </Button>
                    <Button variant="outline" asChild>
                        <a href={site.url.startsWith("http") ? site.url : `https://${site.url}`} target="_blank" rel="noopener noreferrer" className="gap-2">
                            Visit Store <ExternalLink className="h-4 w-4" />
                        </a>
                    </Button>
                </div>
            </div>

            <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_380px]">
                <div className="space-y-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                    <div className="mb-4 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <ChartScatter className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                                Price Distribution
                                            </h3>
                                        </div>
                                        {isFiltered && (
                                            <Button variant="outline" size="sm" onClick={resetFilters}>
                                                Reset filters
                                            </Button>
                                        )}
                                    </div>

                                    {analytics.scatterData.length > 0 && (
                                        <div className="mb-4 flex flex-wrap items-center gap-2">
                                            <Button
                                                variant={filterMode === "range" ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    setFilterMode("range")
                                                    setSelectedPriceBand(null)
                                                }}
                                            >
                                                Range
                                            </Button>
                                            <Button
                                                variant={filterMode === "band" ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setFilterMode("band")}
                                            >
                                                Single bin
                                            </Button>
                                            <div className="ml-auto flex items-center gap-2">
                                                <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                                    Bin size
                                                </label>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    step={1}
                                                    value={binSizeInput}
                                                    onChange={(event) => setBinSizeInput(event.target.value)}
                                                    className="h-9 w-20 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white outline-none ring-0 placeholder:text-zinc-500"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {analytics.scatterData.length === 0 ? (
                                        <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                                            No price data available
                                        </div>
                                    ) : (
                                        <div className="space-y-5">
                                            <div className="h-[280px]">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <ScatterChart margin={{ top: 8, right: 12, bottom: 18, left: 0 }}>
                                                        <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                                                        <XAxis
                                                            type="number"
                                                            dataKey="price"
                                                            tick={{ fill: "#a1a1aa", fontSize: 12 }}
                                                            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                                                            tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
                                                            tickFormatter={(value) => `${Math.round(Number(value))}`}
                                                            label={{ value: "Price", position: "insideBottom", offset: -10, fill: "#a1a1aa", fontSize: 12 }}
                                                        />
                                                        <YAxis
                                                            type="number"
                                                            dataKey="count"
                                                            allowDecimals={false}
                                                            tick={{ fill: "#a1a1aa", fontSize: 12 }}
                                                            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                                                            tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
                                                            label={{ value: "Product Frequency", angle: -90, position: "insideLeft", fill: "#a1a1aa", fontSize: 12 }}
                                                        />
                                                        <Tooltip content={<AnalyticsTooltip />} cursor={{ stroke: "rgba(255,255,255,0.18)" }} />
                                                        <Scatter
                                                            data={visibleScatterData}
                                                            fill="#f4f4f5"
                                                            onClick={(point) => {
                                                                if (point && typeof point.band === "number") {
                                                                    setFilterMode("band")
                                                                    setSelectedPriceBand((current) => (current === point.band ? null : point.band))
                                                                }
                                                            }}
                                                        />
                                                    </ScatterChart>
                                                </ResponsiveContainer>
                                            </div>

                                            <div className="h-[220px] rounded-lg border border-white/5 bg-black/20 p-3">
                                                <div className="mb-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                                                    Cumulative Price Spread
                                                </div>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={activeChartData} margin={{ top: 8, right: 12, left: 0, bottom: 12 }}>
                                                        <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                                                        <XAxis
                                                            type="number"
                                                            dataKey="price"
                                                            domain={["dataMin", "dataMax"]}
                                                            tickCount={6}
                                                            tick={{ fill: "#a1a1aa", fontSize: 11 }}
                                                            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                                                            tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
                                                            tickFormatter={(value) => `${Math.round(Number(value))}`}
                                                        />
                                                        <YAxis
                                                            tick={{ fill: "#a1a1aa", fontSize: 11 }}
                                                            axisLine={{ stroke: "rgba(255,255,255,0.12)" }}
                                                            tickLine={{ stroke: "rgba(255,255,255,0.12)" }}
                                                            tickFormatter={(value) => `${Math.round(Number(value) * 100)}%`}
                                                        />
                                                        <Tooltip content={<CumulativeTooltip />} />
                                                        <Area
                                                            type="monotone"
                                                            dataKey="cumulativeShare"
                                                            stroke="#f4f4f5"
                                                            fill="rgba(244,244,245,0.18)"
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="cumulativeShare"
                                                            stroke="#ffffff"
                                                            dot={false}
                                                            strokeWidth={2}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>

                                            {analytics.scatterData.length > 1 && activeSliderWindow && (
                                                <div className="rounded-lg border border-white/5 bg-black/10 px-3 py-4">
                                                        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                                                            <span>Zoom window</span>
                                                            <span>
                                                            {Math.round(livePriceWindow?.[0] ?? 0)} - {Math.round(livePriceWindow?.[1] ?? 0)}
                                                            </span>
                                                        </div>
                                                    <RangeSlider
                                                        min={0}
                                                        max={Math.max(bandValues.length - 1, 0)}
                                                        step={0.1}
                                                        minRange={0.5}
                                                        value={activeSliderWindow}
                                                        onChange={(value) => {
                                                            setFilterMode("range")
                                                            setSelectedPriceBand(null)
                                                            setSliderWindow([value[0], value[1]])
                                                        }}
                                                        onChangeEnd={(value) => {
                                                            const nextStartIndex = Math.max(0, Math.floor(value[0]))
                                                            const nextEndIndex = Math.min(bandValues.length - 1, Math.ceil(value[1]))
                                                            const nextSliderWindow: [number, number] = [
                                                                nextStartIndex,
                                                                nextEndIndex,
                                                            ]
                                                            setSliderWindow(nextSliderWindow)
                                                            setPriceWindow([
                                                                bandValues[nextStartIndex],
                                                                bandValues[nextEndIndex],
                                                            ])
                                                        }}
                                                        marks={[
                                                            { value: 0, label: analytics.scatterData[0]?.label ?? "$0" },
                                                            {
                                                                value: Math.max(bandValues.length - 1, 0),
                                                                label: analytics.scatterData[analytics.scatterData.length - 1]?.label ?? "$0",
                                                            },
                                                        ]}
                                                        styles={{
                                                            root: { paddingTop: 10 },
                                                            track: { backgroundColor: "rgba(255,255,255,0.08)" },
                                                            bar: { backgroundColor: "#f4f4f5" },
                                                            thumb: { borderColor: "#f4f4f5", backgroundColor: "#18181b" },
                                                            markLabel: { color: "#a1a1aa", fontSize: "11px" },
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-0">
                            <div className="border-b border-white/5 px-6 py-3 text-sm text-muted-foreground">
                                Showing {filteredProducts.length} of {products.length} products
                                {filterMode === "band" && selectedPriceBand != null && (
                                    <span className="ml-2 text-white">
                                        for price band {binSize <= 1 ? `${selectedPriceBand}` : `${selectedPriceBand} - ${selectedPriceBand + binSize - 1}`}
                                    </span>
                                )}
                                {filterMode === "range" && priceWindow != null && visibleMinPrice != null && visibleMaxPrice != null && (
                                    <span className="ml-2 text-white">for zoom window {visibleMinPrice} - {visibleMaxPrice}</span>
                                )}
                            </div>
                            <ProductGrid products={filteredProducts} showCompetitor={false} />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-5 self-start">
                    <Card>
                        <CardContent className="space-y-4 p-6">
                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                    Pricing Snapshot
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Average</div>
                                        <div className="mt-1 text-lg font-semibold">{formatPrice(analytics.averagePrice)}</div>
                                    </div>
                                    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Median</div>
                                        <div className="mt-1 text-lg font-semibold">{formatPrice(analytics.medianPrice)}</div>
                                    </div>
                                    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Min</div>
                                        <div className="mt-1 text-lg font-semibold">{formatPrice(analytics.minPrice)}</div>
                                    </div>
                                    <div className="rounded-lg border border-white/5 bg-black/20 p-3">
                                        <div className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Max</div>
                                        <div className="mt-1 text-lg font-semibold">{formatPrice(analytics.maxPrice)}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                                    <Scale className="h-4 w-4 text-muted-foreground" />
                                    Catalog Range
                                </div>
                                <dl className="space-y-3 text-sm">
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <dt className="text-muted-foreground">Products with price</dt>
                                        <dd className="font-medium text-white">{analytics.pricedCount}</dd>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                        <dt className="text-muted-foreground">Total products</dt>
                                        <dd className="font-medium text-white">{analytics.productCount}</dd>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <dt className="text-muted-foreground">Price range</dt>
                                        <dd className="font-medium text-white">{formatPrice(analytics.range)}</dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="mt-1 space-y-3">
                                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4">
                                    <Accordion type="multiple" defaultValue={["latest-products"]}>
                                        <AccordionItem value="latest-products" className="border-b-0">
                                            <AccordionTrigger className="hover:no-underline">
                                                <span className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                                                    Latest Products
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <LatestProductsList products={products} dateKey="created_at" />
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                                <div className="rounded-xl border border-white/10 bg-white/[0.02] px-4">
                                    <Accordion type="multiple">
                                        <AccordionItem value="latest-updates" className="border-b-0">
                                            <AccordionTrigger className="hover:no-underline">
                                                <span className="flex items-center gap-2">
                                                    <History className="h-4 w-4 text-muted-foreground" />
                                                    Latest Updates
                                                </span>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                                <LatestProductsList products={products} dateKey="last_updated_at" />
                                            </AccordionContent>
                                        </AccordionItem>
                                    </Accordion>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
