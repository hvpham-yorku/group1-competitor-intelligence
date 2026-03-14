"use client"

import * as React from "react"
import { formatDate, SiteProduct } from "@/app/competitors/analytics-utils"

export function LatestProductsList({
    products,
    dateKey,
}: {
    products: SiteProduct[]
    dateKey: "created_at" | "last_updated_at"
}) {
    const items = products
        .filter((product) => typeof product[dateKey] === "string")
        .sort((left, right) =>
            new Date(right[dateKey] as string).getTime() - new Date(left[dateKey] as string).getTime()
        )
        .slice(0, 5)

    if (items.length === 0) {
        return <div className="text-sm text-muted-foreground">No timestamp data available</div>
    }

    return (
        <div className="space-y-3">
            {items.map((product) => (
                <div key={`${dateKey}-${product.product_url}`} className="flex items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{product.title || "Untitled product"}</div>
                        <div className="truncate text-xs text-muted-foreground">{product.product_url}</div>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                        {formatDate(product[dateKey])}
                    </div>
                </div>
            ))}
        </div>
    )
}
