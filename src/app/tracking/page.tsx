import { ProtectPage } from "@/components/ProtectPage";
import { TrackingClient } from "./tracking-client";

export default async function TrackingPage() {
  return (
    <ProtectPage>
      <div className="flex flex-col gap-6 p-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tracking</h1>
          <p className="text-muted-foreground">
            Manage active tracked products, inspect recent scrape activity, and
            prepare the feed for future scheduling and alerts.
          </p>
        </div>
        <TrackingClient />
      </div>
    </ProtectPage>
  );
}
