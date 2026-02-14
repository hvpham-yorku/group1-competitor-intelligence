import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]/route";
import LogsClient from "./logs-client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProtectPage } from "@/components/ProtectPage";

export default async function LogsPage() {

    return (
    <ProtectPage>
      <LogsClient />
    </ProtectPage>
    )  
}