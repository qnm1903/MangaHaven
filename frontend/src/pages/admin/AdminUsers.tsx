import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebounce } from '@/hooks/useDebounce';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminService, type AdminUser } from '@/services/admin_service';
import { toast } from '@/hooks/use_toast';
import {
  Search,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Crown,
  ShieldCheck,
  User,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

// Table row skeleton
const UserRowSkeleton = () => (
  <div className="grid grid-cols-[2fr_1fr_1fr_9rem] items-center gap-4 border-b border-border/20 px-6 py-4">
    <div className="flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-md" />
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
    <Skeleton className="h-5 w-16 rounded-md" />
    <Skeleton className="h-4 w-20" />
    <Skeleton className="h-8 w-20" />
  </div>
);

const AdminUsers: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: AdminUser | null;
    action: 'block' | 'unblock';
  }>({ open: false, user: null, action: 'block' });

  // Debounce search input (300ms)
  const debouncedSearch = useDebounce(searchInput, 300);

  // Reset to page 1 when search changes
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // Fetch users
  const {
    data,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'users', debouncedSearch, page, pageSize],
    queryFn: () => AdminService.searchUsers(debouncedSearch, page, pageSize),
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Block user mutation
  const blockMutation = useMutation({
    mutationFn: (userId: string) => AdminService.blockUser(userId),
    onSuccess: (response) => {
      toast({
        title: 'Đã chặn người dùng',
        description: `${response.email} đã bị chặn thành công.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Lỗi',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  // Unblock user mutation
  const unblockMutation = useMutation({
    mutationFn: (userId: string) => AdminService.unblockUser(userId),
    onSuccess: (response) => {
      toast({
        title: 'Đã bỏ chặn người dùng',
        description: `${response.email} đã được kích hoạt lại.`,
      });
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: (err: Error) => {
      toast({
        title: 'Lỗi',
        description: err.message,
        variant: 'destructive',
      });
    },
  });

  const handleAction = useCallback((user: AdminUser, action: 'block' | 'unblock') => {
    setConfirmDialog({ open: true, user, action });
  }, []);

  const confirmAction = useCallback(() => {
    if (!confirmDialog.user) return;

    if (confirmDialog.action === 'block') {
      blockMutation.mutate(confirmDialog.user.id);
    } else {
      unblockMutation.mutate(confirmDialog.user.id);
    }

    setConfirmDialog({ open: false, user: null, action: 'block' });
  }, [confirmDialog, blockMutation, unblockMutation]);

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Crown className="h-3.5 w-3.5 text-foreground/50" />;
      case 'MODERATOR':
        return <ShieldCheck className="h-3.5 w-3.5 text-foreground/40" />;
      default:
        return <User className="h-3.5 w-3.5 text-foreground/30" />;
    }
  };

  const getRoleBadgeClasses = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'border border-border/40 bg-muted/60 text-foreground/70';
      case 'MODERATOR':
        return 'border border-border/30 bg-muted/40 text-foreground/60';
      default:
        return 'border border-border/20 bg-transparent text-muted-foreground';
    }
  };

  const isProcessing = blockMutation.isPending || unblockMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Quản lý người dùng
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tìm kiếm, xem và quản lý tất cả tài khoản người dùng trong hệ thống.
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

      {/* Main Card */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Danh sách người dùng</CardTitle>
              <CardDescription>
                {data?.pagination.total ?? 0} người dùng
                {debouncedSearch && ` khớp với "${debouncedSearch}"`}
              </CardDescription>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-1 items-center gap-3 sm:max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Tìm theo email..."
                  className="pl-10"
                  aria-label="Tìm kiếm người dùng theo email"
                />
              </div>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v));
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-20" aria-label="Số hàng mỗi trang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0">
          {/* Table Header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_9rem] gap-4 border-y border-border/20 bg-muted/20 px-6 py-2.5 text-xs font-medium text-muted-foreground/70">
            <span>Người dùng</span>
            <span>Vai trò</span>
            <span>Trạng thái</span>
            <span className="text-right">Hành động</span>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div>
              {[1, 2, 3, 4, 5].map((i) => (
                <UserRowSkeleton key={i} />
              ))}
            </div>
          )}

          {/* Error State */}
          {isError && !isLoading && (
            <div className="px-6 py-12 text-center">
              <p className="text-sm text-destructive">
                {error instanceof Error ? error.message : 'Không thể tải danh sách người dùng'}
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-4">
                Thử lại
              </Button>
            </div>
          )}

          {/* Data */}
          {!isLoading && !isError && data && (
            <AnimatePresence mode="popLayout">
              {data.results.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="px-6 py-12 text-center text-sm text-muted-foreground"
                >
                  Không tìm thấy người dùng phù hợp
                  {debouncedSearch && ` với từ khóa "${debouncedSearch}"`}.
                </motion.div>
              ) : (
                data.results.map((user, index) => (
                  <motion.div
                    key={user.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ delay: index * 0.03, duration: 0.2 }}
                    className={cn(
                      'grid grid-cols-[2fr_1fr_1fr_9rem] items-center gap-4 px-6 py-4',
                      'border-b border-border/20 transition-colors hover:bg-muted/30',
                      index % 2 === 0 && 'bg-muted/10'
                    )}
                  >
                    {/* User Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.displayName || 'Chưa đặt tên'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Role */}
                    <Badge className={cn('w-fit', getRoleBadgeClasses(user.role))}>
                      {user.role}
                    </Badge>

                    {/* Status */}
                    <div className="flex items-center gap-1">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full shrink-0',
                          user.isActive ? 'bg-emerald-500' : 'bg-rose-400'
                        )}
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {user.isActive ? 'Hoạt động' : 'Đã chặn'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end">
                      {user.role !== 'ADMIN' && (
                        user.isActive ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(user, 'block')}
                            disabled={isProcessing}
                            className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Chặn
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAction(user, 'unblock')}
                            disabled={isProcessing}
                            className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <CheckCircle className="h-3.5 w-3.5" />
                            Bỏ chặn
                          </Button>
                        )
                      )}
                      {user.role === 'ADMIN' && (
                        <span className="flex h-8 items-center justify-end text-xs text-muted-foreground/40 italic whitespace-nowrap">
                          Không thể chặn admin
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          )}

          {/* Pagination */}
          {data && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/30 px-6 py-4">
              <p className="text-sm text-muted-foreground">
                Trang {data.pagination.page} / {data.pagination.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.pagination.totalPages, p + 1))}
                  disabled={page >= data.pagination.totalPages || isFetching}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open: boolean) => setConfirmDialog((prev) => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'block' ? 'Chặn người dùng?' : 'Bỏ chặn người dùng?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'block'
                ? `Bạn có chắc muốn chặn ${confirmDialog.user?.email}? Người dùng này sẽ không thể đăng nhập vào hệ thống.`
                : `Bạn có chắc muốn bỏ chặn ${confirmDialog.user?.email}? Người dùng này sẽ có thể đăng nhập trở lại.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={isProcessing}
              className={cn(
                confirmDialog.action === 'block'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              )}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {confirmDialog.action === 'block' ? 'Chặn' : 'Bỏ chặn'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminUsers;
