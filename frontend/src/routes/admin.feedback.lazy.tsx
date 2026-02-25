import { createLazyFileRoute } from '@tanstack/react-router';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Inbox, Search, MessageSquare } from 'lucide-react';

const AdminFeedback: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Phản hồi người dùng
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Quản lý các yêu cầu, gợi ý và báo cáo từ người dùng.
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-lg font-semibold">Danh sách phản hồi</CardTitle>
              <CardDescription>Hiển thị tất cả phản hồi từ người dùng</CardDescription>
            </div>
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Tìm phản hồi..."
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <Inbox className="h-12 w-12 text-muted-foreground/40" />
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">
                Chưa có phản hồi nào
              </p>
              <p className="text-xs text-muted-foreground/60">
                Các phản hồi từ người dùng sẽ được hiển thị ở đây
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Placeholder Info ─────────────────────────────────────────────────── */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <MessageSquare className="h-4 w-4 text-foreground/40" />
            Thông tin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tính năng này sẽ cho phép bạn:
          </p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>• Xem các báo cáo từ người dùng</li>
            <li>• Quản lý gợi ý thiết kế</li>
            <li>• Trả lời phản hồi của người dùng</li>
            <li>• Theo dõi trạng thái xử lý</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createLazyFileRoute('/admin/feedback')({
  component: AdminFeedback,
});
