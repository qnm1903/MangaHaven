import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use_toast';
import { FileText, Scroll, ArrowUpDown, ArrowLeftRight, Eye, EyeOff } from 'lucide-react';

export type ReadingMode = 'scroll-vertical' | 'scroll-horizontal' | 'single-page';
export type ImageOrientation = 'vertical' | 'horizontal';

export interface ReaderSettings {
  readingMode: ReadingMode;
  imageGap: number;
  imageOrientation: ImageOrientation;
  showHeader: boolean;
}

interface ReaderSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
}

export const ReaderSettingsModal: React.FC<ReaderSettingsModalProps> = ({
  open,
  onOpenChange,
  settings,
  onSettingsChange,
}) => {
  const { toast } = useToast();

  const handleReadingModeChange = (mode: ReadingMode) => {
    if (mode !== 'scroll-vertical') {
      toast({
        title: 'Tính năng đang trong quá trình phát triển',
        description: 'Chế độ đọc này sẽ được cập nhật trong thời gian tới.',
        variant: 'default',
      });
      return;
    }
    onSettingsChange({ ...settings, readingMode: mode });
  };

  const handleOrientationChange = (orientation: ImageOrientation) => {
    onSettingsChange({ ...settings, imageOrientation: orientation });
  };

  const handleShowHeaderChange = (show: boolean) => {
    onSettingsChange({ ...settings, showHeader: show });
  };

  const handleImageGapChange = (gap: number) => {
    onSettingsChange({ ...settings, imageGap: gap });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] bg-black/95 text-white border-neutral-700">
        <SheetHeader>
          <SheetTitle className="text-white">Kiểu đọc</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Reading Mode */}
          <div className="space-y-3">
            <Label className="text-sm text-neutral-200">Kiểu đọc</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={settings.readingMode === 'single-page' ? 'default' : 'outline'}
                className={
                  settings.readingMode === 'single-page'
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 border-neutral-600 text-white hover:bg-neutral-800'
                }
                onClick={() => handleReadingModeChange('single-page')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Từng trang
              </Button>
              <Button
                variant={settings.readingMode === 'scroll-vertical' ? 'default' : 'outline'}
                className={
                  settings.readingMode === 'scroll-vertical'
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 border-neutral-600 text-white hover:bg-neutral-800'
                }
                onClick={() => handleReadingModeChange('scroll-vertical')}
              >
                <Scroll className="w-4 h-4 mr-2" />
                Trượt đọc
              </Button>
            </div>
          </div>

          {/* Image Gap */}
          <div className="space-y-3">
            <Label className="text-sm text-neutral-200">Khoảng cách giữa các ảnh (px)</Label>
            <Input
              type="number"
              value={settings.imageGap}
              onChange={(e) => handleImageGapChange(Number(e.target.value))}
              className="bg-neutral-800 border-neutral-700 text-neutral-100 placeholder-neutral-500"
              min={0}
              max={50}
            />
          </div>

          {/* Image Orientation */}
          <div className="space-y-3">
            <Label className="text-sm text-neutral-200">Ảnh truyện</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={settings.imageOrientation === 'vertical' ? 'default' : 'outline'}
                className={
                  settings.imageOrientation === 'vertical'
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 border-neutral-600 text-white hover:bg-neutral-800'
                }
                onClick={() => handleOrientationChange('vertical')}
              >
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Vừa dọc
              </Button>
              <Button
                variant={settings.imageOrientation === 'horizontal' ? 'default' : 'outline'}
                className={
                  settings.imageOrientation === 'horizontal'
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 border-neutral-600 text-white hover:bg-neutral-800'
                }
                onClick={() => handleOrientationChange('horizontal')}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Vừa ngang
              </Button>
            </div>
          </div>

          {/* Show Header */}
          <div className="space-y-3">
            <Label className="text-sm text-neutral-200">Thanh Header</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={!settings.showHeader ? 'default' : 'outline'}
                className={
                  !settings.showHeader
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 border-neutral-600 text-white hover:bg-neutral-800'
                }
                onClick={() => handleShowHeaderChange(false)}
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Ẩn
              </Button>
              <Button
                variant={settings.showHeader ? 'default' : 'outline'}
                className={
                  settings.showHeader
                    ? 'bg-white text-black hover:bg-neutral-200'
                    : 'bg-neutral-900 border-neutral-600 text-white hover:bg-neutral-800'
                }
                onClick={() => handleShowHeaderChange(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Hiện
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};