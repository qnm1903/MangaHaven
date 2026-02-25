import * as React from "react"
import { Trans } from '@lingui/react/macro'
import { Link, useLocation } from "@tanstack/react-router"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/useAuth"
import {
  Home,
  Search,
  Heart,
  BookOpen,
  Settings,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LogIn,
  RefreshCw,
  History,
} from "lucide-react"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean
  onToggle?: () => void
}

const navigationItems = [
  {
    title: <Trans>Dashboard</Trans>,
    href: "/",
    icon: Home,
  },
  {
    title: <Trans>Advanced Search</Trans>,
    href: "/search",
    icon: Search,
  },
  {
    title: <Trans>Favorites</Trans>,
    href: "/favorites",
    icon: Heart,
  },
  {
    title: <Trans>Latest Updates</Trans>,
    href: "/latest-updates",
    icon: RefreshCw,
  },
  {
    title: <Trans>Reading History</Trans>,
    href: "/reading-history",
    icon: History,
  },
]

const accountItems = [
  {
    title: <Trans>Profile</Trans>,
    href: "/profile",
    icon: User,
  },
  {
    title: <Trans>Settings</Trans>,
    href: "/settings",
    icon: Settings,
  },
]

export function Sidebar({ className, isCollapsed = false, onToggle }: SidebarProps) {
  const location = useLocation()
  const { user, logout } = useAuth()

  const handleSignOut = async () => {
    await logout()
  }

  const isCurrentPath = (href: string) => {
    if (href === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(href)
  }

  const SidebarItem = ({ item }: { item: typeof navigationItems[0] & { badge?: string } }) => {
    const isActive = isCurrentPath(item.href)

    return (
      <div className="relative group">
        {/* Active indicator - red accent line */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-accent animate-fade-in" />
        )}
        <Link
          to={item.href}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
            isActive
              ? "bg-sidebar-accent text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
            isCollapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <item.icon className={cn(
            "h-5 w-5 flex-shrink-0 transition-colors",
            isActive ? "text-accent" : ""
          )} />
          {!isCollapsed && (
            <>
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge
                  variant={item.badge === 'hot' ? 'destructive' : 'secondary'}
                  className="text-xs px-1.5 py-0.5"
                >
                  {item.badge}
                </Badge>
              )}
            </>
          )}
        </Link>

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap border">
            {item.title}
            {item.badge && (
              <Badge
                variant={item.badge === 'hot' ? 'destructive' : 'secondary'}
                className="ml-2 text-xs px-1.5 py-0.5"
              >
                {item.badge}
              </Badge>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn(
      "flex h-screen flex-col bg-card border-r border-border transition-all duration-300 ease-in-out",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        {!isCollapsed ? (
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <BookOpen className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight">MangaHaven</span>
            </div>
          </div>
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground mx-auto">
            <BookOpen className="h-4 w-4" />
          </div>
        )}

        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Collapsed toggle button */}
      {isCollapsed && (
        <div className="flex justify-center p-2 border-b border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-3">
          {/* Navigation section */}
          <div className="space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Trans>Navigation</Trans>
                </h3>
              </div>
            )}
            {navigationItems.map((item) => (
              <SidebarItem key={item.href} item={item} />
            ))}
          </div>

          {/* Account section */}
          <div className="pt-4 space-y-1">
            {!isCollapsed && (
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <Trans>Account</Trans>
                </h3>
              </div>
            )}
            {accountItems.map((item) => (
              <SidebarItem key={item.href} item={item} />
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* User section */}
      <div className="border-t border-border p-3">
        {user ? (
          <div className="space-y-3">
            {/* User info */}
            {!isCollapsed && (
              <div className="flex items-center gap-3 px-3 py-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
                  {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            {/* Sign out button */}
            <div className="relative group">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className={cn(
                  "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                  isCollapsed ? "px-2 justify-center" : "justify-start px-3"
                )}
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && <span className="ml-3"><Trans>Sign Out</Trans></span>}
              </Button>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap border">
                  <Trans>Sign Out</Trans>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative group">
            <Link to="/auth">
              <Button
                variant="default"
                className={cn(
                  "w-full",
                  isCollapsed ? "px-2 justify-center" : "justify-start px-3"
                )}
              >
                <LogIn className="h-4 w-4" />
                {!isCollapsed && <span className="ml-3"><Trans>Sign In</Trans></span>}
              </Button>
            </Link>

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 whitespace-nowrap border">
                <Trans>Sign In</Trans>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
