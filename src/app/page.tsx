"use client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { ScraperEngine } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";
import { ScrapeProgress } from "@/services/scraper/strategies/interface";
import { Sparkles, Clock } from "lucide-react";
import { ProductGrid } from "@/components/ProductGrid";
import { useSession } from "next-auth/react";
import { SearchBar } from "@/components/SearchBar";

export default function Home() {
  const [inputUrl, setInputUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ScrapeProgress | null>(null);
  const [recentUrls, setRecentUrls] = useState<string[]>([]);

  const { data: MySession, status } = useSession();

  // Fetch recent URLs
  useEffect(() => {
    if (MySession) {
      fetch('/api/scrapes/sites?page=1&pageSize=5')
        .then(res => res.json())
        .then(data => {
          const urls = (data.sites || []).map((site: any) => site.url);
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
      const scraperEngine = ScraperEngine.getInstance();
      const data = await scraperEngine.execute(new ScraperRequest(inputUrl), (p) => {
        setProgress(p);
      });

      const products = data.products || data;
      setResult(products);

      // Save scrape run only if logged in
      if (MySession) {
        fetch("/api/scrapes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: inputUrl,
            products,
          }),
        }).catch(() => {
          // ignore save errors
        });
      }

    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
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
            {progress?.message || 'Analyzing store...'}
            {progress?.count !== undefined && progress.count > 0 && (
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
