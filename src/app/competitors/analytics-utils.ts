"use client"

export type SiteProduct = {
    title?: string
    variants?: Array<{ price?: string }>
    platform?: string
    raw?: Record<string, unknown>
    product_url?: string
    created_at?: string
    last_updated_at?: string
}

export type SiteSummary = {
    url: string
    latestRun?: {
        created_at?: string
        products?: SiteProduct[]
    }
}

export type PricePoint = {
    band: number
    count: number
    price: number
    label: string
    cumulativeCount: number
    cumulativeShare: number
}

export type ProductAnalytics = {
    productCount: number
    averagePrice: number
    medianPrice: number
    minPrice: number
    maxPrice: number
    range: number
    pricedCount: number
    scatterData: PricePoint[]
}

export function getPriceBand(price: number, binSize: number) {
    if (binSize <= 1) {
        return Math.round(price)
    }

    return Math.floor(price / binSize) * binSize
}

export function snapBand(value: number, bands: number[]) {
    if (bands.length === 0) {
        return 0
    }

    let closest = bands[0]
    let bestDistance = Math.abs(closest - value)

    for (const band of bands) {
        const distance = Math.abs(band - value)
        if (distance < bestDistance) {
            closest = band
            bestDistance = distance
        }
    }

    return closest
}

export function getProductPrice(product: SiteProduct): number | null {
    const prices = (product.variants || [])
        .map((variant) => Number.parseFloat(variant.price || ""))
        .filter((price) => Number.isFinite(price))

    if (prices.length === 0) {
        return null
    }

    return Math.min(...prices)
}

export function buildProductAnalytics(products: SiteProduct[], binSize: number): ProductAnalytics {
    const prices = products
        .map(getProductPrice)
        .filter((price): price is number => typeof price === "number")
        .sort((left, right) => left - right)

    if (prices.length === 0) {
        return {
            productCount: products.length,
            averagePrice: 0,
            medianPrice: 0,
            minPrice: 0,
            maxPrice: 0,
            range: 0,
            pricedCount: 0,
            scatterData: [],
        }
    }

    const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length
    const middleIndex = Math.floor(prices.length / 2)
    const medianPrice =
        prices.length % 2 === 0
            ? (prices[middleIndex - 1] + prices[middleIndex]) / 2
            : prices[middleIndex]
    const minPrice = prices[0]
    const maxPrice = prices[prices.length - 1]

    const bucketCounts = new Map<number, number>()
    for (const price of prices) {
        const bucket = getPriceBand(price, binSize)
        bucketCounts.set(bucket, (bucketCounts.get(bucket) || 0) + 1)
    }

    const scatterData = Array.from(bucketCounts.entries())
        .map(([price, count]) => ({
            band: price,
            count,
            price,
            label:
                binSize <= 1
                    ? `${price.toFixed(0)}`
                    : `${price.toFixed(0)}-${(price + binSize - 1).toFixed(0)}`,
            cumulativeCount: 0,
            cumulativeShare: 0,
        }))
        .sort((left, right) => left.price - right.price)

    let runningTotal = 0
    for (const point of scatterData) {
        runningTotal += point.count
        point.cumulativeCount = runningTotal
        point.cumulativeShare = prices.length > 0 ? runningTotal / prices.length : 0
    }

    return {
        productCount: products.length,
        averagePrice,
        medianPrice,
        minPrice,
        maxPrice,
        range: maxPrice - minPrice,
        pricedCount: prices.length,
        scatterData,
    }
}

export function formatPrice(value: number) {
    return `$${value.toFixed(2)}`
}

export function formatDate(value?: string | null) {
    if (!value) {
        return "N/A"
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
        return "N/A"
    }

    return date.toLocaleString()
}

export function getPlatformBadgeLabel(products: unknown[]): string {
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
