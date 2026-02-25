# Cách khắc phục: Hiển thị Chapter Navigation Bar khi cuộn lên

## Vấn đề
Thanh điều hướng chương (Chapter Navigation Bar) không hiển thị đúng khi người dùng cuộn lên, đặc biệt là sau khi chuyển sang chương khác.

## Root Cause
Lỗi xảy ra do hai nguyên nhân chính:

### 1. Effect chạy khi loading spinner được render
Khi trang được refresh hoặc lần đầu tải, component render loading spinner trước, nghĩa là `scrollContainerRef.current` là `null`. Vì effect có dependency array rỗng `[]`, nó chỉ chạy một lần khi component mount, lúc đó không thể tìm thấy scroll parent. Sau này, khi nội dung tải xong và render, effect đã không chạy lại nên listeners không được gắn vào.

### 2. IntersectionObserver theo dõi sentinel element cũ
Khi chuyển sang chương khác, component vẫn mounted (cùng route type), nhưng `bottomSentinelRef` trỏ tới element cũ. Effect duy nhất có dependency array rỗng không chạy lại, nên observer vẫn theo dõi sentinel cũ thay vì sentinel mới. Điều này gây ra navigator không cập nhật trạng thái "at bottom" cho chương mới.

## Giải pháp

### Tách effect thành hai phần:

#### 1. Scroll Listener Effect
```tsx
useEffect(() => {
  if (isChapterLoading || isPagesLoading) return; // Chờ content render xong
  
  // Tìm scroll parent (MainLayout's <main> với overflow-y: auto)
  const root = scrollContainerRef.current;
  if (!root) return;
  
  if (!scrollParentRef.current) {
    let parent = root.parentElement;
    while (parent) {
      const oy = window.getComputedStyle(parent).overflowY;
      if (oy === 'auto' || oy === 'scroll') {
        scrollParentRef.current = parent as HTMLElement;
        break;
      }
      parent = parent.parentElement;
    }
  }
  
  // Gắn scroll listener
  const scrollEl = scrollParentRef.current;
  const handleScroll = () => {
    // Logic xác định scroll direction và hiển thị/ẩn nav
  };
  
  if (scrollEl) scrollEl.addEventListener('scroll', handleScroll, { passive: true });
  
  return () => {
    if (scrollEl) scrollEl.removeEventListener('scroll', handleScroll);
  };
}, [isChapterLoading, isPagesLoading, showNavTemporarily]); // Chạy lại khi content ready
```

**Key points:**
- Guard với `if (isChapterLoading || isPagesLoading) return` đảm bảo scroll parent được tìm khi content đã render
- Dependency array bao gồm loading states để effect chạy lại khi content ready
- Cache scroll parent ref để tránh re-walk DOM liên tục

#### 2. IntersectionObserver Effect
```tsx
useEffect(() => {
  if (isChapterLoading || isPagesLoading) return;
  
  const scrollEl = scrollParentRef.current;
  if (!scrollEl || !bottomSentinelRef.current) return;
  
  // Tạo observer mới cho sentinel hiện tại
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries[0].isIntersecting;
      isAtBottomRef.current = visible;
      setIsAtBottom(visible);
      if (visible) {
        setNavBarVisible(false);
      }
    },
    { root: scrollEl, threshold: 0.1 }
  );
  
  observer.observe(bottomSentinelRef.current);
  
  return () => observer.disconnect();
}, [chapterId, isChapterLoading, isPagesLoading]); // Chạy lại khi chương thay đổi
```

**Key points:**
- Dependency array bao gồm `chapterId` để effect chạy lại khi chuyển chương
- Mỗi lần chạy lại, observer cũ disconnect và observer mới được tạo để theo dõi sentinel mới
- Đảm bảo observer luôn theo dõi element đúng

### 3. Chapter Change Reset
```tsx
useEffect(() => {
  lastScrollY.current = 0;
  isAtBottomRef.current = false;
  setIsAtBottom(false);
  setLoadedImages(new Set());
  
  if (scrollParentRef.current) {
    scrollParentRef.current.scrollTop = 0;
  }
  showNavTemporarily();
}, [chapterId, showNavTemporarily]);
```

**Purpose:**
- Reset scroll position tracking
- Clear "at bottom" flag để scroll handler hoạt động bình thường
- Clear loaded images để hiển thị skeletons cho chương mới
- Scroll container về top
- Show nav tạm thời cho chương mới

## Kết quả
- ✅ Scroll listener được gắn ngay khi content render (không chỉ khi mount)
- ✅ IntersectionObserver theo dõi sentinel đúng mỗi lần chuyển chương
- ✅ Nav bar hiển thị khi cuộc lên từ bottom
- ✅ Nav bar hoạt động đúng sau chuyển chương

## Code References
- [ChapterReader.tsx](../frontend/src/pages/ChapterReader.tsx) - Lines 115-195 (scroll effects)
- [ChapterNavigationBar.tsx](../frontend/src/components/chapter/ChapterNavigationBar.tsx) - Floating nav bar component
