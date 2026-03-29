import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "@/app/api/auth/auth-utils";
import { MatchingClient } from "@/app/matching/matching-client";
import { getMatchingWorkspace } from "@/services/matching/workspace";

export default async function MatchingPage() {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    redirect("/login");
  }

  const workspace = await getMatchingWorkspace({
    userId,
    page: 1,
    pageSize: 20,
    includeSuggestions: false,
    matchFilter: "all",
    titleQuery: "",
  });

  return <MatchingClient initialWorkspace={workspace} />;
}
