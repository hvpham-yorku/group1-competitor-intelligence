"use client"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { Sparkles, Clock } from "lucide-react";
import { ProductGrid } from "@/components/ProductGrid";
import { useSession } from "next-auth/react";
import { SearchBar } from "@/components/SearchBar";
import type { ScrapeProgress } from "@/services/scraper/strategies/interface";
import type { NormalizedProduct } from "@/services/scraper/normalized-types";

type ScrapesSitesResponse = {
  sites?: Array<{ url?: string }>;
};

type ScrapeRunResponse = {
  message?: string;
  products?: unknown[];
  reason?: string;
  attempts?: Array<{
    strategy?: string;
    status?: number;
    endpoint?: string;
    error?: string;
  }>;
};

export default function Home() {
  const [inputUrl, setInputUrl] = useState('');
  const [result, setResult] = useState<NormalizedProduct[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentUrls, setRecentUrls] = useState<string[]>([]);
  const [progress, setProgress] = useState<ScrapeProgress | null>(null);

  const { data: MySession } = useSession();

  // Fetch recent URLs
  useEffect(() => {
    if (MySession) {
      fetch('/api/scrapes/sites?page=1&pageSize=5')
        .then(res => res.json())
        .then((data: ScrapesSitesResponse) => {
          const urls = (data.sites || [])
            .map((site) => site.url)
            .filter((url): url is string => typeof url === "string" && url.length > 0);
          setRecentUrls(urls);
        })
        .catch(() => {
          // ignore errors
        });
    }
  }, [MySession]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const streamUrl = `/api/scrapes/run/stream?url=${encodeURIComponent(inputUrl)}`;

      await new Promise<void>((resolve, reject) => {
        const source = new EventSource(streamUrl);

        source.addEventListener("progress", (event) => {
          const data = JSON.parse((event as MessageEvent).data) as ScrapeProgress;
          setProgress(data);
        });

        source.addEventListener("done", (event) => {
          const data = JSON.parse((event as MessageEvent).data) as ScrapeRunResponse;
          const products = Array.isArray(data.products) ? (data.products as NormalizedProduct[]) : [];
          setResult(products);
          source.close();
          resolve();
        });

        source.addEventListener("error", (event) => {
          try {
            const data = JSON.parse((event as MessageEvent).data) as ScrapeRunResponse;
            if (Array.isArray(data.attempts) && data.attempts.length > 0) {
              console.warn("Scrape failed with diagnostics", {
                reason: data.reason,
                attempts: data.attempts,
              });
            }
            reject(new Error(data.message || "Failed to fetch data"));
          } catch {
            reject(new Error("Failed to fetch data"));
          } finally {
            source.close();
          }
        });
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center pt-32 pb-20 font-sans text-foreground">
      <div className="flex w-full max-w-6xl flex-col items-center gap-6 px-4">

        {!result && (
          <div className="mb-4 space-y-2 flex flex-col items-center">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              Playground <Sparkles className="h-6 w-6" />
            </h1>
            <p className="text-muted-foreground">
              Enter a store URL to find accessible product and pricing data.
            </p>
          </div>
        )}

        <SearchBar
          value={inputUrl}
          onChange={setInputUrl}
          onSubmit={handleSubmit}
          placeholder="Search..."
          loading={loading}
        />

        {/* Recent URLs */}
        {!result && MySession && recentUrls.length > 0 && (
          <div className="w-full max-w-xl">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Clock className="h-3 w-3" />
              <span>Recent searches</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentUrls.map((url) => (
                <Badge
                  key={url}
                  variant="outline"
                  onClick={() => setInputUrl(url)}
                  className="cursor-pointer hover:bg-white/5 transition truncate max-w-xs"
                  title={url}
                >
                  {url}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="text-sm text-muted-foreground animate-pulse">
            {progress?.message || "Analyzing store..."}
            {typeof progress?.count === "number" && progress.count > 0 && (
              <span className="ml-2 font-medium">({progress.count} products found so far)</span>
            )}
          </div>
        )}
        {error && <div className="text-sm text-red-500">{error}</div>}

        {result && (
          <div className="mt-8 w-full">
            <div className="text-left text-sm text-muted-foreground mb-4">
              Found {result.length} products
            </div>
            <ProductGrid products={result} sourceUrl={inputUrl} />
          </div>
        )}
      </div>
    </div>
  );
}
