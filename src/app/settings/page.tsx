import { SettingsClient } from "./settings-client";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage the app settings that are currently active in your workspace.
        </p>
      </div>
      <SettingsClient />
    </div>
  );
}
