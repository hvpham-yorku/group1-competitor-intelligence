import { CompetitorsClient } from "./competitors-client"

export default function CompetitorsPage() {
    return (
        <div className="flex flex-col gap-6 p-4">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Competitors</h1>
                <p className="text-muted-foreground">Benchmark store performance and tracking status. (Analytics coming soon)</p>
            </div>

            <CompetitorsClient />
        </div>
    )
}
