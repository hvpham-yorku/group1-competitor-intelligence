"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { ScraperEngine } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";
import { Sparkles } from "lucide-react";
import { ProductGrid } from "@/components/ProductGrid";

export default function Home() {
  const [inputUrl, setInputUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const scraperEngine = ScraperEngine.getInstance();
      const data = await scraperEngine.execute(new ScraperRequest(inputUrl));
      setResult(data.products || data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] flex-col items-center pt-32 font-sans text-foreground">
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

        <form onSubmit={handleSubmit} className="relative w-full max-w-xl mx-auto flex items-center">
          <Input
            type="text"
            placeholder="Search..."
            className="flex-1 h-12 shadow-sm text-lg pl-6 pr-28 rounded-full"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
          />
          <Button
            type="submit"
            size="sm"
            className="absolute right-1.5 top-1.5 bottom-1.5 h-auto px-6 rounded-full z-10"
          >
            Search
          </Button>
        </form>

        {loading && <div className="text-sm text-muted-foreground">Analyzing store...</div>}
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
