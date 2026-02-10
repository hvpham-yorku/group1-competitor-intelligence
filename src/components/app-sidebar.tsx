"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
    Search,
    Settings,
    LayoutDashboard,
    Package,
    Users,
    FileText,
    User,
    Settings2,
    TrendingUp,
    Activity,
    List,
    ChevronRight,
} from "lucide-react"

import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarRail,
} from "@/components/ui/sidebar"

// Navigation Data
const applicationItems = [
    {
        title: "Playground",
        url: "/",
        icon: Search,
    },
    {
        title: "Competitors",
        url: "/competitors",
        icon: Users,
    },
    {
        title: "Products",
        url: "/products",
        icon: Package,
    },
]

const systemItems = [
    {
        title: "Logs",
        url: "/logs",
        icon: FileText,
    },
    {
        title: "Account",
        url: "/account",
        icon: User,
    },
    {
        title: "Settings",
        url: "/settings",
        icon: Settings2,
    },
]

export function AppSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className="border-b px-4 py-4">
                <div className="flex items-center gap-2 font-bold text-xl uppercase tracking-tighter">
                    {/* <span className="group-data-[collapsible=icon]:hidden">CI-APP</span> */}
                    <LayoutDashboard className="h-6 w-6 shrink-0" />
                    <span className="group-data-[collapsible=icon]:hidden truncate">CI-APP</span>
                </div>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Application</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {applicationItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={pathname === item.url}
                                    >
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent >
                </SidebarGroup >

                <SidebarGroup>
                    <SidebarGroupLabel>System</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {systemItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        tooltip={item.title}
                                        isActive={pathname === item.url}
                                    >
                                        <a href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </a>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent >
            <SidebarFooter className="p-4 border-t">
                <a
                    href="https://github.com/hvpham-yorku/group1-competitor-intelligence"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-2 group-data-[collapsible=icon]:hidden"
                >
                    <span className="truncate">group1-competitor-intelligence</span>
                </a>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar >
    )
}
