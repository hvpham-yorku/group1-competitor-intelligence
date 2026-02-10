export default function AccountPage() {
    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-2xl font-bold">Account</h1>
            <p className="text-muted-foreground">Manage your personal details and preferences.</p>

            <div className="grid gap-6">
                <div className="space-y-4 rounded-xl border p-6">
                    <h2 className="text-lg font-semibold">Profile</h2>
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center font-bold text-lg">U</div>
                            <div>
                                <div className="font-medium">User Name</div>
                                <div className="text-sm text-muted-foreground">user@example.com</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
