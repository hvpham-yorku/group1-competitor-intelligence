"use client";

import * as React from "react";
import type { ProductDetail } from "@/services/products/utils";
import {
  ProductDetailLoading,
  ProductDetailView,
} from "@/components/product-detail-view";

type ProductDetailResponse = {
  product?: ProductDetail;
  message?: string;
};

function formatLatestEvent(detail: ProductDetail | null): string {
  const value = detail?.summary.latest_seen_at;
  return value ? new Date(value).toLocaleString() : "N/A";
}

export function ProductDetailClient({
  sourceProductId,
}: {
  sourceProductId: string;
}) {
  const [loading, setLoading] = React.useState(true);
  const [detail, setDetail] = React.useState<ProductDetail | null>(null);

  React.useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/products/${encodeURIComponent(sourceProductId)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("Failed to load product");
        }

        const data = (await response.json()) as ProductDetailResponse;
        if (active) {
          setDetail(data.product || null);
        }
      } catch (error) {
        console.error("Failed to load product detail", error);
        if (active) {
          setDetail(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [sourceProductId]);

  if (loading) {
    return <ProductDetailLoading label="Loading product details..." />;
  }

  return (
    <ProductDetailView
      detail={detail}
      backHref="/products"
      backLabel="Back to products"
      emptyLabel="Product not found"
      visitLabel="Visit product"
      chartDescription="Snapshot series reconstructed from collected scrape observations."
      eventDescription="Latest snapshots collected for this product."
      fourthCard={{
        label: "Latest event",
        value: formatLatestEvent(detail),
      }}
    />
  );
}
