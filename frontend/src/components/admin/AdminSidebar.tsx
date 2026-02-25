import React, { useEffect, memo } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  LayoutGrid,
  Users,
  Settings,
  BarChart3,
  FileText,
  Home,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  MessageCircle,
  Inbox,
} from 'lucide-react';

interface AdminSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const mainNavigation: NavItem[] = [
  {
    label: 'Tổng quan',
    href: '/admin/dashboard',
    icon: LayoutGrid,
  },
  {
    label: 'Người dùng',
    href: '/admin/users',
    icon: Users,
  },
  {
    label: 'Manga',
    href: '/admin/manga',
    icon: BookOpen,
  },
  {
    label: 'Thống kê',
    href: '/admin/analytics',
    icon: BarChart3,
  },
];

const secondaryNavigation: NavItem[] = [
  {
    label: 'Báo cáo',
    href: '/admin/reports',
    icon: FileText,
  },
  {
    label: 'Cài đặt',
    href: '/admin/settings',
    icon: Settings,
  },
];

const communicationNavigation: NavItem[] = [
  {
    label: 'Phản hồi người dùng',
    href: '/admin/feedback',
    icon: Inbox,
  },
  {
    label: 'Tin nhắn',
    href: '/admin/messages',
    icon: MessageCircle,
  },
];

const COLLAPSED_KEY = 'admin_sidebar_collapsed';

// Stable NavItem component
const SidebarNavItem = memo(({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) => {
  const location = useLocation();
  const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
  const Icon = item.icon;

  return (
    <Button
      variant="ghost"
      size={isCollapsed ? 'icon' : 'default'}
      className={cn(
        'relative w-full justify-start gap-3 font-medium transition-all duration-200',
        isCollapsed ? 'h-11 w-11 justify-center p-0' : 'h-11 px-4',
        isActive
          ? 'bg-primary/10 text-primary hover:bg-primary/15 dark:bg-primary/20'
          : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
      )}
      asChild
    >
      <Link to={item.href}>
        <Icon className={cn('h-5 w-5 shrink-0', isActive && 'text-primary')} />
        <AnimatePresence initial={false}>
          {!isCollapsed && (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {item.badge && !isCollapsed && (
          <span className="ml-auto rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
            {item.badge}
          </span>
        )}
        {/* Active indicator */}
        {isActive && (
          <motion.div
            layoutId="sidebar-active-indicator"
            className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-primary"
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}
      </Link>
    </Button>
  );
});

SidebarNavItem.displayName = 'SidebarNavItem';

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isCollapsed, onToggle }) => {
  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 72 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        'relative flex h-full flex-col border-r border-border/40',
        'bg-gradient-to-b from-card/80 to-card/60 backdrop-blur-xl'
      )}
    >
      {/* Header */}
      <div className="flex h-16 items-center justify-between px-4">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                MangaVerse
              </p>
              <h2 className="text-lg font-bold tracking-tight text-foreground">Admin</h2>
            </motion.div>
          )}
        </AnimatePresence>

        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-9 w-9 shrink-0 rounded-lg hover:bg-muted/60"
          aria-label={isCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Back to user site */}
      <div className="px-3">
        <Button
          variant="outline"
          size={isCollapsed ? 'icon' : 'default'}
          className={cn(
            'w-full gap-2 border-dashed transition-all duration-200',
            isCollapsed ? 'h-10 w-10 justify-center p-0' : 'justify-start'
          )}
          asChild
        >
          <Link to="/">
            <Home className="h-4 w-4 shrink-0" />
            {!isCollapsed && <span>Về trang chủ</span>}
          </Link>
        </Button>
      </div>

      <Separator className="my-4 opacity-50" />

      {/* Main Navigation */}
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {!isCollapsed && (
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Chính
            </p>
          )}
          {mainNavigation.map((item) => (
            <SidebarNavItem key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        <Separator className="my-4 opacity-50" />

        <nav className="space-y-1">
          {!isCollapsed && (
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Hệ thống
            </p>
          )}
          {secondaryNavigation.map((item) => (
            <SidebarNavItem key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>

        <Separator className="my-4 opacity-50" />

        <nav className="space-y-1">
          {!isCollapsed && (
            <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              Giao tiếp
            </p>
          )}
          {communicationNavigation.map((item) => (
            <SidebarNavItem key={item.href} item={item} isCollapsed={isCollapsed} />
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t border-border/40 p-4">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-center"
            >
              <p className="text-xs text-muted-foreground/60">
                MangaVerse Admin v1.0
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.aside>
  );
};
