"use client";

import Link from "next/link";
import Image from "next/image";
import * as React from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Menu, Select } from "@mantine/core";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  TrackedProductSummary,
  TrackedStoreSummary,
} from "@/services/tracking/utils";

type TrackingResponse = {
  products?: TrackedProductSummary[];
  stores?: TrackedStoreSummary[];
  message?: string;
};

type ProductSortKey = "title" | "latest_price" | "price_delta" | "latest_seen_at";
type StoreSortKey = "store_domain" | "latest_scraped_at" | "is_owned_store";
type ActiveTab = "products" | "stores";

const PRODUCT_SORT_OPTIONS: Array<{ key: ProductSortKey; label: string }> = [
  { key: "latest_seen_at", label: "Latest event" },
  { key: "title", label: "Title" },
  { key: "latest_price", label: "Latest price" },
  { key: "price_delta", label: "Price delta" },
];

const STORE_SORT_OPTIONS: Array<{ key: StoreSortKey; label: string }> = [
  { key: "is_owned_store", label: "Ownership" },
  { key: "latest_scraped_at", label: "Latest event" },
  { key: "store_domain", label: "Store" },
];

function getNextUtcOne(now: Date): Date {
  const next = new Date(now);
  next.setUTCHours(1, 0, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next;
}

function formatCountdown(target: Date, now: Date) {
  const remainingMs = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds
    .toString()
    .padStart(2, "0")}s`;
}

function formatPrice(value: number | null) {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "N/A";
}

function formatDelta(value: number | null) {
  if (typeof value !== "number") {
    return "N/A";
  }

  const sign = value > 0 ? "+" : "";
  return `${sign}$${value.toFixed(2)}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No observations yet";
  }

  return new Date(value).toLocaleString();
}

function StatusBanner({
  tone,
  message,
}: {
  tone: "success" | "error";
  message: string;
}) {
  return (
    <div
      className={
        tone === "success"
          ? "flex items-center gap-2 rounded-md border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
          : "rounded-md border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
      }
    >
      {tone === "success" ? <CheckCircle2 className="h-4 w-4" /> : null}
      <span>{message}</span>
    </div>
  );
}

export function TrackingClient() {
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [activeTab, setActiveTab] = React.useState<ActiveTab>("products");
  const [productSortKey, setProductSortKey] = React.useState<ProductSortKey>("latest_seen_at");
  const [storeSortKey, setStoreSortKey] = React.useState<StoreSortKey>("is_owned_store");
  const [sortDescending, setSortDescending] = React.useState(true);
  const [products, setProducts] = React.useState<TrackedProductSummary[]>([]);
  const [stores, setStores] = React.useState<TrackedStoreSummary[]>([]);
  const [storeUrl, setStoreUrl] = React.useState("");
  const [submittingStore, setSubmittingStore] = React.useState(false);
  const [workingKey, setWorkingKey] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<{
    tone: "success" | "error";
    message: string;
  } | null>(null);
  const [now, setNow] = React.useState(() => new Date());

  const loadTrackedItems = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tracked_products", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load tracked products");
      }

      const data = (await response.json()) as TrackingResponse;
      setProducts(Array.isArray(data.products) ? data.products : []);
      setStores(Array.isArray(data.stores) ? data.stores : []);
    } catch (error) {
      console.error("Failed to load tracked products", error);
      setProducts([]);
      setStores([]);
      setNotice({
        tone: "error",
        message: "Failed to load tracking data.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadTrackedItems();
  }, [loadTrackedItems]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const filteredProducts = React.useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const next = products.filter((product) => {
      if (!lowered) {
        return true;
      }

      return [
        product.title,
        product.vendor || "",
        product.store_domain,
        product.product_type || "",
      ].some((value) => value.toLowerCase().includes(lowered));
    });

    next.sort((left, right) => {
      if (productSortKey === "title") {
        return sortDescending
          ? right.title.localeCompare(left.title)
          : left.title.localeCompare(right.title);
      }

      if (productSortKey === "latest_seen_at") {
        const leftValue = left.latest_seen_at ? new Date(left.latest_seen_at).getTime() : 0;
        const rightValue = right.latest_seen_at ? new Date(right.latest_seen_at).getTime() : 0;
        return sortDescending ? rightValue - leftValue : leftValue - rightValue;
      }

      const leftValue = left[productSortKey] ?? Number.NEGATIVE_INFINITY;
      const rightValue = right[productSortKey] ?? Number.NEGATIVE_INFINITY;
      return sortDescending
        ? Number(rightValue) - Number(leftValue)
        : Number(leftValue) - Number(rightValue);
    });

    return next;
  }, [products, query, productSortKey, sortDescending]);

  const filteredStores = React.useMemo(() => {
    const lowered = query.trim().toLowerCase();
    const next = stores.filter((store) => {
      if (!lowered) {
        return true;
      }

      return [
        store.store_domain,
        store.store_platform || "",
        store.is_owned_store ? "my store" : "tracked store",
      ].some((value) => value.toLowerCase().includes(lowered));
    });

    next.sort((left, right) => {
      if (storeSortKey === "store_domain") {
        return sortDescending
          ? right.store_domain.localeCompare(left.store_domain)
          : left.store_domain.localeCompare(right.store_domain);
      }

      if (storeSortKey === "latest_scraped_at") {
        const leftValue = left.latest_scraped_at ? new Date(left.latest_scraped_at).getTime() : 0;
        const rightValue = right.latest_scraped_at ? new Date(right.latest_scraped_at).getTime() : 0;
        return sortDescending ? rightValue - leftValue : leftValue - rightValue;
      }

      return sortDescending
        ? Number(right.is_owned_store) - Number(left.is_owned_store)
        : Number(left.is_owned_store) - Number(right.is_owned_store);
    });

    return next;
  }, [stores, query, storeSortKey, sortDescending]);

  const metrics = React.useMemo(() => {
    const latestTracked = products.filter((product) => product.latest_price != null);
    const changed = products.filter(
      (product) => product.price_delta != null && product.price_delta !== 0
    );

    return {
      totalProducts: products.length,
      totalStores: stores.length,
      live: latestTracked.length,
      changed: changed.length,
    };
  }, [products, stores]);

  const handleTrackStore = async (isOwnedStore = false) => {
    const trimmed = storeUrl.trim();
    if (!trimmed) {
      return;
    }

    setSubmittingStore(true);
    setNotice(null);

    try {
      const response = await fetch("/api/tracked_products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          track_type: "store",
          store_url: trimmed,
          is_owned_store: isOwnedStore,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Failed to track store");
      }

      await loadTrackedItems();
      setStoreUrl("");
      setActiveTab("stores");
      setNotice({
        tone: "success",
        message: isOwnedStore ? "Store saved as your store." : "Store added to tracking.",
      });
    } catch (error) {
      console.error("Failed to track store", error);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to track store.",
      });
    } finally {
      setSubmittingStore(false);
    }
  };

  const handleUntrackProduct = async (product: TrackedProductSummary) => {
    setWorkingKey(`product:${product.source_product_id}`);
    setNotice(null);

    try {
      const response = await fetch("/api/tracked_products", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_url: product.product_url,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Failed to untrack product");
      }

      setProducts((current) =>
        current.filter((item) => item.product_url !== product.product_url)
      );
      setNotice({
        tone: "success",
        message: "Product removed from tracking.",
      });
    } catch (error) {
      console.error("Failed to untrack product", error);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to untrack product.",
      });
    } finally {
      setWorkingKey(null);
    }
  };

  const handleStoreAction = async (
    store: TrackedStoreSummary,
    action: "untrack" | "own"
  ) => {
    setWorkingKey(`store:${store.store_id}:${action}`);
    setNotice(null);

    try {
      const response = await fetch("/api/tracked_products", {
        method: action === "untrack" ? "DELETE" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          track_type: "store",
          store_url: store.store_domain,
          is_owned_store: action === "own",
        }),
      });

      const data = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message || "Failed to update store tracking");
      }

      await loadTrackedItems();
      setNotice({
        tone: "success",
        message: action === "own" ? "Store marked as your store." : "Store removed from tracking.",
      });
    } catch (error) {
      console.error("Failed to update tracked store", error);
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : "Failed to update store tracking.",
      });
    } finally {
      setWorkingKey(null);
    }
  };

  const nextScheduledRun = React.useMemo(() => getNextUtcOne(now), [now]);
  const nextScheduledCountdown = React.useMemo(
    () => formatCountdown(nextScheduledRun, now),
    [nextScheduledRun, now]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Tracked products</CardDescription>
            <CardTitle>{metrics.totalProducts}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Tracked stores</CardDescription>
            <CardTitle>{metrics.totalStores}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Live price history</CardDescription>
            <CardTitle>{metrics.live}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.02]">
          <CardHeader>
            <CardDescription>Recent price changes</CardDescription>
            <CardTitle>{metrics.changed}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/[0.02]">
        <CardHeader className="flex flex-col gap-4 border-b border-white/5 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Active tracking</CardTitle>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">Daily at 01:00 UTC</Badge>
              <span>Next run in {nextScheduledCountdown}</span>
              <span>({nextScheduledRun.toUTCString()})</span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
            <div className="relative min-w-[260px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <Input
                className="h-10 pl-9"
                placeholder={activeTab === "products" ? "Search tracked products" : "Search tracked stores"}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="flex h-10 items-center gap-2 rounded-md border border-white/10 bg-black/20 px-2 py-0">
              <div className="flex h-10 items-center justify-center px-1">
                <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
              </div>
              <Select
                aria-label="Sort tracked items"
                checkIconPosition="right"
                className="min-w-[180px]"
                data={(activeTab === "products" ? PRODUCT_SORT_OPTIONS : STORE_SORT_OPTIONS).map((option) => ({
                  value: option.key,
                  label: option.label,
                }))}
                onChange={(value) => {
                  if (!value) {
                    return;
                  }

                  if (activeTab === "products") {
                    setProductSortKey(value as ProductSortKey);
                  } else {
                    setStoreSortKey(value as StoreSortKey);
                  }
                }}
                radius="md"
                size="sm"
                styles={{
                  dropdown: {
                    backgroundColor: "#09090b",
                    border: "1px solid rgba(255,255,255,0.12)",
                  },
                  input: {
                    height: "40px",
                    minHeight: "40px",
                    backgroundColor: "rgba(255,255,255,0.02)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#fafafa",
                  },
                  item: {
                    color: "#fafafa",
                  },
                  label: {
                    color: "rgba(255,255,255,0.62)",
                  },
                }}
                value={activeTab === "products" ? productSortKey : storeSortKey}
              />
              <Button
                className="h-9 px-4 self-center"
                onClick={() => setSortDescending((value) => !value)}
                type="button"
                variant="outline"
              >
                {sortDescending ? "Desc" : "Asc"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {notice ? <StatusBanner message={notice.message} tone={notice.tone} /> : null}

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as ActiveTab)}>
            <TabsList>
              <TabsTrigger value="products">Products</TabsTrigger>
              <TabsTrigger value="stores">Stores</TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="pt-4">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Loading tracked products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-lg font-medium">No tracked products yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Select products in the results grid, use `Track Selected`, then inspect them here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Latest price</TableHead>
                      <TableHead>Delta</TableHead>
                      <TableHead>Latest event</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow key={product.source_product_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image_url ? (
                              <Image
                                alt={product.title}
                                className="h-11 w-11 rounded-md border border-white/10 object-cover"
                                height={44}
                                src={product.image_url}
                                width={44}
                              />
                            ) : (
                              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-dashed border-white/10 text-[10px] text-muted-foreground">
                                N/A
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-medium">{product.title}</div>
                              <div className="truncate text-xs text-muted-foreground">
                                {product.vendor || "Unknown vendor"}
                                {product.product_type ? ` - ${product.product_type}` : ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span>{product.store_domain}</span>
                            {product.store_platform && (
                              <Badge className="w-fit capitalize" variant="outline">
                                {product.store_platform}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{product.schedule_label}</span>
                        </TableCell>
                        <TableCell>{formatPrice(product.latest_price)}</TableCell>
                        <TableCell>
                          <span
                            className={
                              typeof product.price_delta !== "number"
                                ? "text-muted-foreground"
                                : product.price_delta > 0
                                  ? "text-rose-400"
                                  : product.price_delta < 0
                                    ? "text-emerald-400"
                                    : "text-muted-foreground"
                            }
                          >
                            {formatDelta(product.price_delta)}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(product.latest_seen_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/products/${product.source_product_id}`}>Details</Link>
                            </Button>
                            <Button
                              disabled={workingKey === `product:${product.source_product_id}`}
                              onClick={() => void handleUntrackProduct(product)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {workingKey === `product:${product.source_product_id}` ? "Removing..." : "Untrack"}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="stores" className="space-y-4 pt-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <Input
                  className="h-10 md:max-w-md"
                  placeholder="Add store URL to tracking"
                  value={storeUrl}
                  onChange={(event) => setStoreUrl(event.target.value)}
                />
                <div className="flex items-center gap-2">
                  <Button
                    className="h-10 px-4"
                    disabled={submittingStore || storeUrl.trim().length === 0}
                    onClick={() => void handleTrackStore(false)}
                    type="button"
                  >
                    {submittingStore ? "Adding..." : "Track Store"}
                  </Button>
                  <Button
                    className="h-10 px-4"
                    disabled={submittingStore || storeUrl.trim().length === 0}
                    onClick={() => void handleTrackStore(true)}
                    type="button"
                    variant="outline"
                  >
                    Set As My Store
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                  Loading tracked stores...
                </div>
              ) : filteredStores.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-lg font-medium">No tracked stores yet</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Track a store from the playground, competitors page, or add it directly here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Latest event</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStores.map((store) => (
                      <TableRow key={store.store_id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{store.store_domain}</span>
                            <span className="text-xs capitalize text-muted-foreground">
                              {store.store_platform || "Unknown platform"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={store.is_owned_store ? "default" : "outline"}>
                            {store.is_owned_store ? "My Store" : "Tracked Store"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{store.schedule_label}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(store.latest_scraped_at)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button asChild size="sm" variant="outline">
                              <Link href={`/competitors?site=${encodeURIComponent(store.store_domain)}`}>Analysis</Link>
                            </Button>
                            <Button asChild size="sm" variant="outline">
                              <a href={`https://${store.store_domain}`} target="_blank" rel="noreferrer">
                                Visit
                                <ArrowUpRight className="ml-2 h-4 w-4" />
                              </a>
                            </Button>
                            <Button
                              disabled={workingKey === `store:${store.store_id}:untrack`}
                              onClick={() => void handleStoreAction(store, "untrack")}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {workingKey === `store:${store.store_id}:untrack` ? "Removing..." : "Untrack"}
                            </Button>
                            <Menu position="bottom-end" shadow="md" width={220}>
                              <Menu.Target>
                                <Button size="sm" type="button" variant="outline">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item
                                  disabled={store.is_owned_store || workingKey === `store:${store.store_id}:own`}
                                  onClick={() => void handleStoreAction(store, "own")}
                                >
                                  {store.is_owned_store ? "Current My Store" : "Set As My Store"}
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
