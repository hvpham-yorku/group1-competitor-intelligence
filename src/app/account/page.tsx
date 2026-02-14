import { ProtectPage } from "@/components/ProtectPage";
import AccountInfo from "./client_account";

export default async function AccountPage() {

    return (
        <ProtectPage>
            <AccountInfo></AccountInfo>    
        </ProtectPage>
    )
}
