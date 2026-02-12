"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ProductGrid } from "@/components/ProductGrid"
import { Trash2, X, ChevronDown, ChevronUp } from "lucide-react"

type Run = { id: number; created_at: string }

type Site = {
  url: string
  runs: Run[]
  latestRun: { id: number; created_at: string; products: any[] } | null
}

function ConfirmPopup(props: {
  open: boolean
  title: string
  description: React.ReactNode
  confirmText?: string
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}) {
  if (!props.open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          props.onCancel()
        }
      }}
    >
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-xl">
        <div className="space-y-2">
          <div className="text-lg font-semibold">{props.title}</div>
          <div className="text-sm text-muted-foreground">{props.description}</div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => {
              props.onCancel()
            }}
          >
            Cancel
          </Button>

          <Button
            onClick={() => {
              props.onConfirm()
            }}
          >
            {props.confirmText ?? "Delete"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function LogsClient() {
  const pageSize = 5

  const [pendingQuery, setPendingQuery] = useState("")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sites, setSites] = useState<Site[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // only render the product grid for the expanded site
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null)

  const [selectedRunByUrl, setSelectedRunByUrl] = useState<Record<string, number>>({})
  const [productsByRunId, setProductsByRunId] = useState<Record<number, any[]>>({})

  // confirm state
  const [confirmSiteUrl, setConfirmSiteUrl] = useState<string | null>(null)
  const [confirmRunId, setConfirmRunId] = useState<number | null>(null)

  const fetchSites = async (q: string, p: number) => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set("page", String(p))
      params.set("pageSize", String(pageSize))

      if (q.trim()) {
        params.set("query", q.trim())
      }

      const res = await fetch(`/api/scrapes/sites?${params.toString()}`)
      if (!res.ok) {
        throw new Error("Failed to load logs")
      }

      const data = await res.json()
      const nextSites: Site[] = data.sites || []

      setSites(nextSites)
      setTotalPages(data.totalPages || 1)

      // set defaults and cache latest products so expanding feels instant
      const nextSelected: Record<string, number> = {}
      const nextCache: Record<number, any[]> = {}

      for (const s of nextSites) {
        const latestId = s.latestRun?.id ?? s.runs?.[0]?.id
        if (latestId) {
          nextSelected[s.url] = latestId
        }
        if (s.latestRun?.id) {
          nextCache[s.latestRun.id] = s.latestRun.products || []
        }
      }

      setSelectedRunByUrl((prev) => ({ ...nextSelected, ...prev }))
      setProductsByRunId((prev) => ({ ...nextCache, ...prev }))

      if (expandedUrl) {
        const stillExists = nextSites.some((s) => s.url === expandedUrl)
        if (!stillExists) {
          setExpandedUrl(null)
        }
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSites(query, page)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, page])

  const ensureRunLoaded = async (runId: number) => {
    if (productsByRunId[runId]) {
      return
    }

    const res = await fetch(`/api/scrapes/run?id=${runId}`)
    if (!res.ok) {
      throw new Error("Failed to load run")
    }

    const data = await res.json()
    setProductsByRunId((prev) => ({ ...prev, [runId]: data.products || [] }))
  }

  const doDeleteSite = async (url: string) => {
    await fetch(`/api/scrapes/site?url=${encodeURIComponent(url)}`, { method: "DELETE" })

    if (expandedUrl === url) {
      setExpandedUrl(null)
    }

    await fetchSites(query, page)
  }

  const doDeleteRun = async (runId: number) => {
    await fetch(`/api/scrapes/run?id=${runId}`, { method: "DELETE" })

    setProductsByRunId((prev) => {
      const copy = { ...prev }
      delete copy[runId]
      return copy
    })

    await fetchSites(query, page)
  }

  const pageButtons = useMemo(() => {
    const maxButtons = 7
    const pages: number[] = []

    const start = Math.max(1, page - Math.floor(maxButtons / 2))
    const end = Math.min(totalPages, start + maxButtons - 1)
    const adjustedStart = Math.max(1, end - maxButtons + 1)

    for (let i = adjustedStart; i <= end; i++) {
      pages.push(i)
    }

    return pages
  }, [page, totalPages])

  return (
    <div className="flex flex-col gap-4">
      {/* header + search */}
      <div className="flex flex-col items-center text-center gap-3">
        <h1 className="text-2xl font-bold">System Logs</h1>
        <p className="text-muted-foreground max-w-2xl">
          Scrape history (only the expanded website renders the product grid).
        </p>

        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xl justify-center">
          <Input
            placeholder="Search by website (e.g. rhodeskin.com)"
            value={pendingQuery}
            onChange={(e) => {
              setPendingQuery(e.target.value)
            }}
            className="flex-1"
          />

          <Button
            onClick={() => {
              setPage(1)
              setQuery(pendingQuery)
            }}
          >
            Search
          </Button>

          <Button
            variant="secondary"
            onClick={() => {
              setPendingQuery("")
              setQuery("")
              setPage(1)
            }}
          >
            Clear
          </Button>
        </div>
      </div>

      {loading && <div className="text-sm text-muted-foreground">Loading logs...</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="flex flex-col gap-4">
        {sites.map((site) => {
          const selectedRunId =
            selectedRunByUrl[site.url] ?? site.latestRun?.id ?? site.runs?.[0]?.id

          const isExpanded = expandedUrl === site.url
          const products = selectedRunId ? productsByRunId[selectedRunId] : []

          return (
            <div key={site.url} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-lg font-semibold">{site.url}</div>
                  <div className="text-xs text-muted-foreground">
                    Runs: {site.runs?.length ?? 0}
                    {selectedRunId ? ` • Selected #${selectedRunId}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={async () => {
                      const next = isExpanded ? null : site.url
                      setExpandedUrl(next)

                      if (!isExpanded && selectedRunId) {
                        try {
                          await ensureRunLoaded(selectedRunId)
                        } catch {
                          // ignore
                        }
                      }
                    }}
                  >
                    {isExpanded ? (
                      <span className="flex items-center gap-2">
                        Collapse <ChevronUp className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        View <ChevronDown className="h-4 w-4" />
                      </span>
                    )}
                  </Button>

                  {/* big X delete website */}
                  <button
                    title="Delete website (all runs)"
                    onClick={() => {
                      setConfirmSiteUrl(site.url)
                    }}
                    className="h-10 w-10 rounded-full border flex items-center justify-center hover:bg-destructive hover:text-white transition"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <details className="mt-3 rounded-lg border border-white/10 p-3">
                <summary className="cursor-pointer select-none text-sm font-medium">
                  History (pick a run)
                </summary>

                <div className="mt-3 flex flex-col gap-2">
                  {site.runs.map((run) => {
                    const isSelected = run.id === selectedRunId

                    return (
                      <div
                        key={run.id}
                        className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 border ${
                          isSelected ? "border-white/30" : "border-white/10"
                        }`}
                      >
                        <button
                          className="flex-1 text-left text-sm"
                          onClick={async () => {
                            setSelectedRunByUrl((prev) => ({ ...prev, [site.url]: run.id }))
                            try {
                              await ensureRunLoaded(run.id)
                            } catch {
                            }
                          }}
                        >
                          <span className={isSelected ? "font-semibold" : ""}>{run.created_at}</span>{" "}
                          <span className="text-xs text-muted-foreground">#{run.id}</span>
                        </button>

                        <button
                          title="Delete this run"
                          onClick={() => {
                            setConfirmRunId(run.id)
                          }}
                          className="h-9 w-9 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/5"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </details>

              {isExpanded && (
                <div className="mt-4 space-y-2">
                  <div className="text-sm text-muted-foreground">
                    Found {products?.length ?? 0} products
                  </div>
                  <ProductGrid products={products || []} sourceUrl={site.url} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* pagination */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <Button
          variant="secondary"
          onClick={() => {
            setPage((p) => Math.max(1, p - 1))
          }}
          disabled={page <= 1}
        >
          Prev
        </Button>

        {pageButtons.map((p) => (
          <Button
            key={p}
            variant={p === page ? "default" : "secondary"}
            onClick={() => {
              setPage(p)
            }}
          >
            {p}
          </Button>
        ))}

        <Button
          variant="secondary"
          onClick={() => {
            setPage((p) => Math.min(totalPages, p + 1))
          }}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>

      {/* confirm delete website */}
      <ConfirmPopup
        open={confirmSiteUrl !== null}
        title="Delete website?"
        description={
          <>
            This will delete <span className="font-semibold">{confirmSiteUrl}</span> and{" "}
            <span className="font-semibold">all</span> of its saved scrape runs. This can’t be undone.
          </>
        }
        confirmText="Delete website"
        onCancel={() => {
          setConfirmSiteUrl(null)
        }}
        onConfirm={async () => {
          const url = confirmSiteUrl
          setConfirmSiteUrl(null)

          if (url) {
            await doDeleteSite(url)
          }
        }}
      />

      {/* confirm delete run */}
      <ConfirmPopup
        open={confirmRunId !== null}
        title="Delete run?"
        description="This will delete the selected historical scrape run. This can’t be undone."
        confirmText="Delete run"
        onCancel={() => {
          setConfirmRunId(null)
        }}
        onConfirm={async () => {
          const id = confirmRunId
          setConfirmRunId(null)

          if (id !== null) {
            await doDeleteRun(id)
          }
        }}
      />
    </div>
  )
}