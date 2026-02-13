import { ProtectPage } from "@/components/protect_page_component";
import AccountInfo from "./client_account";

export default async function AccountPage() {

    return (
        <ProtectPage>
            <AccountInfo></AccountInfo>    
        </ProtectPage>
    )
}
