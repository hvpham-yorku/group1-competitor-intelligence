"use client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { ScraperEngine } from "@/services/scraper/engine";
import { ScraperRequest } from "@/services/scraper/request";

export default function Home() {
  const [inputUrl, setInputUrl] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const scraperEngine = ScraperEngine.getInstance();
    const data = await scraperEngine.execute(new ScraperRequest(inputUrl));
    setResult(data.products || data);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans text-foreground">
      <main className="flex min-h-screen w-full max-w-5xl flex-col items-center justify-center py-32 px-16 bg-background sm:items-center">
        <div className="flex flex-col items-center gap-4 text-center w-full">
          <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
            <Input
              type="text"
              placeholder="Enter shopify URL (e.g rhodeskin.com) "
              className="flex-1"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
            />
            <Button type="submit">Submit</Button>
          </form>

          {result && (
            <div className="mt-4 space-y-2">
              {result.map((item: any) => (
                <div key={item.id} className="p-3 border rounded flex gap-4 items-center">
                  {item.images?.[0] && (
                    <img
                      src={item.images[0].src}
                      alt={item.title}
                      className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                    />
                  )}
                  <div className="flex-1">
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="text-sm text-gray-600">{item.vendor}</p>
                    <p className="text-sm font-medium text-emerald-600">
                      ${item.variants?.[0]?.price}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
