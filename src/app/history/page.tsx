import LogsClient from "./logs-client";
import { ProtectPage } from "@/components/ProtectPage";

export default async function LogsPage() {

    return (
    <ProtectPage>
      <LogsClient />
    </ProtectPage>
    )  
}
