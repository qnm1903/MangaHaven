import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminService, type DashboardSummary } from '@/services/admin_service';
import {
  Users,
  BookOpen,
  ShieldCheck,
  UserX,
  RefreshCw,
  TrendingUp,
  Clock,
  Crown,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

// Stat card configuration
interface StatConfig {
  key: keyof DashboardSummary['totals'];
  label: string;
  icon: React.ElementType;
  formatValue?: (value: number) => string;
}

const statConfigs: StatConfig[] = [
  { key: 'userCount',           label: 'Tổng người dùng', icon: Users },
  { key: 'activeUserCount',     label: 'Đang hoạt động',  icon: TrendingUp },
  { key: 'publishedMangaCount', label: 'Bộ truyện',       icon: BookOpen },
  { key: 'blockedUserCount',    label: 'Đã chặn',         icon: UserX },
];

// Skeleton components
const StatCardSkeleton = () => (
  <Card className="border-border/30 bg-card/60">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-9 rounded-lg" />
    </CardHeader>
    <CardContent>
      <Skeleton className="h-8 w-20 mb-1" />
    </CardContent>
  </Card>
);

const ActivitySkeleton = () => (
  <div className="space-y-px">
    {[1, 2, 3].map((i) => (
      <div key={i} className="flex items-center gap-3 px-1 py-3">
        <Skeleton className="h-8 w-8 rounded-md shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-3 w-16" />
      </div>
    ))}
  </div>
);

// Status helpers
const getStatusBadge = (status: string) => {
  switch (status) {
    case 'ONGOING':   return { label: 'Đang ra',    dot: 'bg-emerald-500' };
    case 'COMPLETED': return { label: 'Hoàn thành', dot: 'bg-foreground/40' };
    case 'HIATUS':    return { label: 'Tạm dừng',   dot: 'bg-amber-400' };
    case 'CANCELLED': return { label: 'Đã hủy',     dot: 'bg-rose-400' };
    default:          return { label: status,        dot: 'bg-muted-foreground/40' };
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'ADMIN':     return 'Admin';
    case 'MODERATOR': return 'Mod';
    default:          return 'User';
  }
};

// Component
const AdminDashboard: React.FC = () => {
  const {
    data: summary,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<DashboardSummary>({
    queryKey: ['admin', 'dashboard', 'summary'],
    queryFn: () => AdminService.getDashboardSummary(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: vi });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Tổng quan hệ thống
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Theo dõi tình trạng hoạt động của MangaVerse.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2 text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Làm mới
        </Button>
      </div>

      {/* ── Error State ──────────────────────────────────────────────────────── */}
      {isError && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center"
        >
          <AlertCircle className="mx-auto h-8 w-8 text-destructive/60" />
          <h3 className="mt-3 text-sm font-medium text-destructive">Không thể tải dữ liệu</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {error instanceof Error ? error.message : 'Đã xảy ra lỗi khi tải dữ liệu dashboard'}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
            Thử lại
          </Button>
        </motion.div>
      )}

      {/* ── Stats Grid ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : summary ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          {statConfigs.map((config) => {
            const Icon = config.icon;
            const value = summary.totals[config.key];
            return (
              <motion.div key={config.key} variants={itemVariants}>
                <Card className="group border-border/30 bg-card/60 backdrop-blur-sm transition-shadow duration-200 hover:shadow-sm">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                    <CardTitle className="text-[11px] font-medium tracking-widest text-muted-foreground/70 uppercase">
                      {config.label}
                    </CardTitle>
                    <div className="rounded-lg border border-border/30 bg-muted/50 p-2 transition-colors group-hover:bg-muted">
                      <Icon className="h-4 w-4 text-foreground/35" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-3xl font-semibold tracking-tight text-foreground">
                      {config.formatValue ? config.formatValue(value) : value.toLocaleString()}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      ) : null}

      {/* ── Content Grid ─────────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Manga */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.3 }}
        >
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-foreground/40" />
                <CardTitle className="text-base font-medium">Manga gần đây</CardTitle>
              </div>
              <CardDescription>Các bộ truyện được cập nhật gần nhất</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ActivitySkeleton />
              ) : summary?.recentManga && summary.recentManga.length > 0 ? (
                <div className="space-y-px">
                  {summary.recentManga.map((manga) => {
                    const status = getStatusBadge(manga.status);
                    return (
                      <div
                        key={manga.id}
                        className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-muted/40"
                      >
                        <div className="h-8 w-8 shrink-0 rounded-md bg-muted/60 flex items-center justify-center">
                          <BookOpen className="h-3.5 w-3.5 text-foreground/30" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{manga.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {manga.views.toLocaleString()} lượt xem · {manga.totalChapters} chương
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={cn('h-1.5 w-1.5 rounded-full', status.dot)} />
                          <span className="text-xs text-muted-foreground">{status.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">Chưa có manga nào</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.26, duration: 0.3 }}
        >
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-foreground/40" />
                <CardTitle className="text-base font-medium">Người dùng mới</CardTitle>
              </div>
              <CardDescription>Các tài khoản đăng ký gần đây</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <ActivitySkeleton />
              ) : summary?.recentUsers && summary.recentUsers.length > 0 ? (
                <div className="space-y-px">
                  {summary.recentUsers.slice(0, 10).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="h-8 w-8 shrink-0 rounded-md bg-muted/60 flex items-center justify-center">
                        {user.role === 'ADMIN' ? (
                          <Crown className="h-3.5 w-3.5 text-foreground/50" />
                        ) : user.role === 'MODERATOR' ? (
                          <ShieldCheck className="h-3.5 w-3.5 text-foreground/40" />
                        ) : (
                          <Users className="h-3.5 w-3.5 text-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.displayName || 'Người dùng'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className="text-xs font-medium text-foreground/50">
                          {getRoleLabel(user.role)}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground/60">
                          <Clock className="h-3 w-3" />
                          {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Chưa có người dùng nào
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Quick Stats Strip ─────────────────────────────────────────────────── */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.3 }}
        >
          <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
            <CardContent className="py-0">
              <div className="grid grid-cols-3 divide-x divide-border/30">
                {[
                  { icon: Crown,       value: summary.totals.adminCount,      label: 'Quản trị viên' },
                  { icon: ShieldCheck, value: summary.totals.moderatorCount,   label: 'Điều hành viên' },
                  {
                    icon: TrendingUp,
                    value: summary.totals.userCount > 0
                      ? `${Math.round((summary.totals.activeUserCount / summary.totals.userCount) * 100)}%`
                      : '0%',
                    label: 'Tỷ lệ hoạt động',
                  },
                ].map(({ icon: Icon, value, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1 py-6">
                    <Icon className="h-4 w-4 text-foreground/30 mb-1" />
                    <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default AdminDashboard;
