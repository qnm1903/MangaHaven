import { createLazyFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageCircle, Search, Send } from 'lucide-react';

const AdminMessages: React.FC = () => {
  const [selectedUser] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {/*Page Header*/}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Tin nhắn
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Trò chuyện trực tiếp với người dùng.
        </p>
      </div>

      {/* ── Messenger Layout ────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* Conversations List */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm lg:row-span-2">
          <CardHeader className="pb-3">
            <div className="space-y-3">
              <CardTitle className="text-base font-semibold">Cuộc trò chuyện</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Tìm người..."
                  className="pl-10 h-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Chưa có cuộc trò chuyện nào
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Các tin nhắn sẽ xuất hiện ở đây
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="border-border/30 bg-card/60 backdrop-blur-sm flex flex-col min-h-[500px]">
          {selectedUser ? (
            <>
              <CardHeader className="pb-4 border-b border-border/30">
                <CardTitle className="text-base font-semibold">
                  Đang trò chuyện
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col items-center justify-center">
                <div className="text-center space-y-2">
                  <MessageCircle className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Tính năng tin nhắn đang được phát triển
                  </p>
                </div>
              </CardContent>
              <div className="border-t border-border/30 p-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập tin nhắn..."
                    disabled
                  />
                  <Button size="icon" disabled>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full h-full">
              <div className="text-center space-y-3">
                <MessageCircle className="h-16 w-16 text-muted-foreground/30 mx-auto" />
                <p className="text-sm font-medium text-muted-foreground">
                  Chọn một cuộc trò chuyện để bắt đầu
                </p>
                <p className="text-xs text-muted-foreground/60">
                  Danh sách cuộc trò chuyện hiện tại trống
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* ── Info Box ────────────────────────────────────────────────────────── */}
      <Card className="border-border/30 bg-card/60 backdrop-blur-sm border-dashed">
        <CardHeader>
          <CardTitle className="text-base font-medium">ℹ️ Trạng thái phát triển</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Tính năng tin nhắn Messenger đang được xây dựng. Sắp hoàn thành trong các bản cập nhật tiếp theo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export const Route = createLazyFileRoute('/admin/messages')({
  component: AdminMessages,
});
