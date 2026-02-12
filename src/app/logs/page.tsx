import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import LogsClient from "./logs-client";

export default async function LogsPage() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
        return null; // logged out => show nothing
    }
    return <LogsClient />;
  } catch {
    // If JWT decryption fails, treat as logged out and show nothing
    return null;
  }
}