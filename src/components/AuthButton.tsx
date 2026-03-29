"use client"

import { useState } from "react"
import { signOut, useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AuthButton() {
    const { data: session } = useSession()
    const [open, setOpen] = useState(false)

    if (session) {
        return (
            <>
                <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>Log Out</Button>
                {open && (
                    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
                        <div className="w-full max-w-md p-8 bg-background border border-grey-600 rounded-xl shadow-lg flex flex-col gap-6">
                            <h2 className="text-2xl font-semibold text-center">Are you sure you want to log out?</h2>
                            <div className="flex justify-end gap-4">
                                <Button onClick={() => setOpen(false)}>Cancel</Button>
                                <Button variant="destructive" onClick={() => signOut()}>Log Out</Button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    }

    return (
        <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log In</Link>
        </Button>
    )
}
