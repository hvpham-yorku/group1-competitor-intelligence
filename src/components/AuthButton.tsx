"use client"

import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AuthButton() {
    const { data: session } = useSession()

    if (session) {
        return (
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
                Log Out
            </Button>
        )
    }

    return (
        <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log In</Link>
        </Button>
    )
}
