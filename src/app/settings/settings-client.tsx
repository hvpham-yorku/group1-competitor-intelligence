"use client";

import * as React from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@mantine/core";

type TrackedStoreSummary = {
  tracked_id: number;
  store_id: number;
  store_domain: string;
  store_platform: string | null;
  tracked_at: string;
  schedule_label: string;
  latest_scrape_run_id: number | null;
  latest_scraped_at: string | null;
  is_owned_store: boolean;
};

type TrackingResponse = {
  stores?: TrackedStoreSummary[];
};

export function SettingsClient() {
  const [loading, setLoading] = React.useState(true);
  const [stores, setStores] = React.useState<TrackedStoreSummary[]>([]);
  const [selectedStore, setSelectedStore] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadTrackedStores = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/tracked_products", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load tracked stores");
      }

      const data = (await response.json()) as TrackingResponse;
      const nextStores = Array.isArray(data.stores) ? data.stores : [];
      setStores(nextStores);
      const owned = nextStores.find((store) => store.is_owned_store);
      setSelectedStore(owned?.store_domain ?? null);
    } catch (error) {
      console.error("Failed to load tracked stores", error);
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadTrackedStores();
  }, [loadTrackedStores]);

  const handleSave = async () => {
    if (!selectedStore) {
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/tracked_products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          track_type: "store",
          store_url: selectedStore,
          is_owned_store: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save your store selection");
      }

      await loadTrackedStores();
      setMessage("Your store preference was updated.");
    } catch (error) {
      console.error("Failed to save owned store", error);
      setMessage("Failed to update your store preference.");
    } finally {
      setSaving(false);
    }
  };

  const ownedStore = stores.find((store) => store.is_owned_store);

  return (
    <div className="space-y-4 rounded-xl border p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">My Store</h2>
        <p className="text-sm text-muted-foreground">
          Choose which tracked store should be treated as your own store across the app.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading tracked stores...
        </div>
      ) : stores.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          No tracked stores yet. Track a store first from the playground, competitors page, or tracking page.
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Tracked stores: {stores.length}</Badge>
            {ownedStore ? <Badge>Current: {ownedStore.store_domain}</Badge> : null}
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm text-muted-foreground">Store</label>
              <Select
                data={stores.map((store) => ({
                  value: store.store_domain,
                  label: store.store_domain,
                }))}
                value={selectedStore}
                onChange={setSelectedStore}
                placeholder="Select a tracked store"
                searchable
              />
            </div>
            <Button
              disabled={saving || !selectedStore || selectedStore === ownedStore?.store_domain}
              onClick={() => void handleSave()}
              type="button"
            >
              {saving ? "Saving..." : "Set As My Store"}
            </Button>
          </div>
          {message ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              {message}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
