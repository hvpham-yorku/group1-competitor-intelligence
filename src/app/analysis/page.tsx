import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getExistingUserIdFromSession } from "@/app/api/auth/auth-utils";
import { AnalysisClient } from "@/app/analysis/analysis-client";
import { getMatchedAnalysis } from "@/services/matched-analysis/get-matched-analysis";

export default async function AnalysisPage() {
  const session = await getServerSession(authOptions);
  const userId = await getExistingUserIdFromSession(session);

  if (!userId) {
    redirect("/login");
  }

  const initialData = await getMatchedAnalysis({
    userId,
    page: 1,
    pageSize: 5000,
    deltaDirection: "all",
    sortKey: "absolute_gap",
    sortOrder: "desc",
    query: "",
    store: "",
    competitor: "",
  });

  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Matched Analysis</h1>
      </div>
      <AnalysisClient initialData={initialData} />
    </div>
  );
}
