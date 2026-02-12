"use client"

import { useEffect, useMemo, useState } from "react"
import { ProductGrid } from "@/components/ProductGrid"
import { Trash2, X, ChevronDown, ChevronUp } from "lucide-react"
import { SearchBar } from "@/components/SearchBar"
import { Button } from "@/components/ui/button"

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

  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [sites, setSites] = useState<Site[]>([])
  const [totalPages, setTotalPages] = useState(1)

  // Track which specific run is expanded (not just site)
  const [expandedRunId, setExpandedRunId] = useState<number | null>(null)
  const [productsByRunId, setProductsByRunId] = useState<Record<number, any[]>>({})

  // Track which sites have expanded run lists
  const [expandedSiteUrls, setExpandedSiteUrls] = useState<Set<string>>(new Set())

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

      // Cache latest products so expanding feels instant
      const nextCache: Record<number, any[]> = {}

      for (const s of nextSites) {
        if (s.latestRun?.id) {
          nextCache[s.latestRun.id] = s.latestRun.products || []
        }
      }

      setProductsByRunId((prev) => ({ ...nextCache, ...prev }))
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
    await fetchSites(query, page)
  }

  const doDeleteRun = async (runId: number) => {
    await fetch(`/api/scrapes/run?id=${runId}`, { method: "DELETE" })

    setProductsByRunId((prev) => {
      const copy = { ...prev }
      delete copy[runId]
      return copy
    })

    if (expandedRunId === runId) {
      setExpandedRunId(null)
    }

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
    <div className="flex min-h-[80vh] flex-col items-center pt-32 font-sans text-foreground">
      <div className="flex w-full max-w-6xl flex-col gap-6 px-4">
        <div className="flex flex-col items-center text-center gap-2">
          <h1 className="text-2xl font-bold">Scrape History</h1>
          <p className="text-muted-foreground max-w-2xl">
            View and manage your scrape history. Click on any run to view its products.
          </p>
        </div>

        <SearchBar
          value={query}
          onChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          onSubmit={(e) => {
            e.preventDefault()
            fetchSites(query, 1)
          }}
          placeholder="Search by website (e.g. example.com)"
          loading={loading}
        />

        {loading && <div className="text-sm text-muted-foreground">Loading logs...</div>}
        {error && <div className="text-sm text-red-500">{error}</div>}

        <div className="w-full flex flex-col gap-4">
          {sites.map((site) => {
            return (
              <div key={site.url} className="rounded-xl border p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">{site.url}</div>
                    <div className="text-xs text-muted-foreground">
                      {site.runs?.length ?? 0} {site.runs?.length === 1 ? 'run' : 'runs'}
                    </div>
                  </div>

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

                <div className="space-y-2">
                  {site.runs.slice(0, expandedSiteUrls.has(site.url) ? undefined : 1).map((run) => {
                    const isExpanded = expandedRunId === run.id
                    const products = productsByRunId[run.id] || []

                    return (
                      <div key={run.id} className="rounded-lg border border-white/10 overflow-hidden">
                        <div
                          className="flex items-center justify-between gap-3 p-3 hover:bg-white/5 transition cursor-pointer"
                          onClick={async () => {
                            const nextExpanded = isExpanded ? null : run.id
                            setExpandedRunId(nextExpanded)

                            if (!isExpanded) {
                              try {
                                await ensureRunLoaded(run.id)
                              } catch {
                                // ignore
                              }
                            }
                          }}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <span className="text-sm font-medium">{run.created_at}</span>
                            <span className="text-xs text-muted-foreground">#{run.id}</span>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>

                          <button
                            title="Delete this run"
                            onClick={(e) => {
                              e.stopPropagation()
                              setConfirmRunId(run.id)
                            }}
                            className="relative z-10 h-9 w-9 rounded-md border border-white/10 flex items-center justify-center hover:bg-white/5"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-white/10 p-4 bg-white/[0.02]">
                            <div className="text-sm text-muted-foreground mb-3">
                              Found {products?.length ?? 0} products
                            </div>
                            <ProductGrid products={products || []} sourceUrl={site.url} />
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {site.runs.length > 1 && (
                    <button
                      onClick={() => {
                        setExpandedSiteUrls(prev => {
                          const next = new Set(prev)
                          if (next.has(site.url)) {
                            next.delete(site.url)
                          } else {
                            next.add(site.url)
                          }
                          return next
                        })
                      }}
                      className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition flex items-center justify-center gap-2"
                    >
                      {expandedSiteUrls.has(site.url) ? (
                        <>
                          <ChevronUp className="h-4 w-4" />
                          Show less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-4 w-4" />
                          Show {site.runs.length - 1} more {site.runs.length - 1 === 1 ? 'run' : 'runs'}
                        </>
                      )}
                    </button>
                  )}
                </div>
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
              <span className="font-semibold">all</span> of its saved scrape runs. This can't be undone.
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
          description="This will delete the selected historical scrape run. This can't be undone."
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
    </div>
  )
}