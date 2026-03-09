import {
  listScrapeSites as listScrapeSitesFromRepository,
  type ListScrapeSitesResult as RepositoryListScrapeSitesResult,
} from "@/persistence/scrapes-repository";
import { safeJsonParse } from "./utils";

export type ListScrapeSitesInput = {
  userId: number;
  page: number;
  pageSize: number;
  query?: string;
};

export type ListScrapeSitesResult = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  sites: Array<{
    url: string;
    runs: Array<{ id: number; created_at: string }>;
    latestRun: {
      id: number;
      created_at: string;
      products: unknown[];
    } | null;
  }>;
};

function mapResult(
  result: RepositoryListScrapeSitesResult
): ListScrapeSitesResult {
  return {
    page: result.page,
    pageSize: result.pageSize,
    total: result.total,
    totalPages: result.totalPages,
    sites: result.sites.map((site) => ({
      url: site.url,
      runs: site.runs,
      latestRun: site.latestRun
        ? {
            id: site.latestRun.id,
            created_at: site.latestRun.created_at,
            products: safeJsonParse<unknown[]>(
              site.latestRun.products_json || "[]",
              []
            ),
          }
        : null,
    })),
  };
}

export async function listScrapeSites(
  input: ListScrapeSitesInput
): Promise<ListScrapeSitesResult> {
  const result = await listScrapeSitesFromRepository(input.userId, {
    page: input.page,
    pageSize: input.pageSize,
    query: input.query,
  });

  return mapResult(result);
}
