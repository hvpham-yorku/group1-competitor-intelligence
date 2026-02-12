"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormEvent } from "react"

interface SearchBarProps {
    value: string
    onChange: (value: string) => void
    onSubmit: (e: FormEvent<HTMLFormElement>) => void
    placeholder?: string
    loading?: boolean
}

export function SearchBar({ value, onChange, onSubmit, placeholder = "Search...", loading = false }: SearchBarProps) {
    return (
        <form onSubmit={onSubmit} className="relative w-full max-w-xl mx-auto flex items-center">
            <Input
                type="text"
                placeholder={placeholder}
                className="flex-1 h-12 shadow-sm text-lg pl-6 pr-28 rounded-full"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={loading}
            />
            <Button
                type="submit"
                size="sm"
                className="absolute right-1.5 top-1.5 bottom-1.5 h-auto px-6 rounded-full z-10"
                disabled={loading}
            >
                Search
            </Button>
        </form>
    )
}
