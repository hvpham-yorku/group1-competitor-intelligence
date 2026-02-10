export default function SettingsPage() {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">System Settings</h1>
            <div className="grid gap-6">
                <div className="space-y-4 rounded-xl border p-6">
                    <h2 className="text-lg font-semibold">General</h2>
                    <div className="h-12 border-dashed border rounded-md flex items-center justify-center text-sm text-muted-foreground">
                        Theme & Version settings
                    </div>
                </div>

                <div className="space-y-4 rounded-xl border p-6">
                    <h2 className="text-lg font-semibold">Scraper Configuration</h2>
                    <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Manages scraping strategies and API limits.</div>
                        <div className="h-12 border-dashed border rounded-md flex items-center justify-center text-sm text-muted-foreground">
                            Config options coming soon...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
