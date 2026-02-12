import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import LogsClient from "./logs-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function LogsPage() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return (
        <div className="flex min-h-[80vh] flex-col items-center justify-center px-4">
          <div className="w-full max-w-md text-center space-y-4">
            <h2 className="text-2xl font-semibold">Login Required</h2>
            <p className="text-sm text-muted-foreground">
              You must be logged in to view your scrape history.
            </p>
            <Button asChild>
              <Link href="/login">Log In</Link>
            </Button>
          </div>
        </div>
      );
    }
    return <LogsClient />;
  } catch {
    // If JWT decryption fails, treat as logged out and show nothing
    return null;
  }
}