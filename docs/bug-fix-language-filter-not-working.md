# Bug Fix: Lọc ngôn ngữ không hoạt động

## Ngày: 21/02/2026

Tài liệu này ghi lại **2 bug riêng biệt** liên quan đến language filter, có nguyên nhân khác nhau và xảy ra ở các trang khác nhau.

---

# 🐛 Bug #1 — Dashboard hiển thị sai ngôn ngữ

## Mô tả

Khi người dùng chọn ngôn ngữ trong Settings (VD: chỉ chọn English), Dashboard → "Cập nhật mới nhất" vẫn hiển thị chapters từ nhiều ngôn ngữ khác (ES-LA, PL, VI...). Bug này **không** gây lỗi 400, chỉ đơn giản là filter bị bỏ qua.

## Nguyên nhân

### 1. Frontend → Backend: Axios gửi sai format

Axios (≥ v1.0) mặc định serialize mảng với dấu ngoặc vuông:

```
GET /api/v1/manga/latest-chapters?translatedLanguage[]=en&translatedLanguage[]=vi
```

### 2. Express 5 không parse được

Express 5 đã **loại bỏ thư viện `qs`** và dùng `querystring` built-in của Node.js. `querystring` built-in coi `translatedLanguage[]` là tên key theo đúng nghĩa đen:

```javascript
// Express 5 nhận được:
req.query = {
  "translatedLanguage[]": ["en", "vi"]  // ← key CÓ dấu []
}

// Code controller destructure:
const { translatedLanguage } = req.query;
console.log(translatedLanguage); // undefined ❌
```

`translatedLanguage` luôn là `undefined` → backend không gửi filter → MangaDex trả về tất cả ngôn ngữ.

### 3. MangaDex API yêu cầu format `[]`

MangaDex bắt buộc có dấu `[]` cho array parameters:

```
✅ ĐÚNG:  translatedLanguage[]=en&translatedLanguage[]=vi
❌ SAI:   translatedLanguage=en&translatedLanguage=vi
```

Nếu không có `[]`, MangaDex bỏ qua filter và trả về tất cả ngôn ngữ.

## Giải pháp

### Tầng 1 — Frontend → Backend (plain keys, không có `[]`)

Thêm `paramsSerializer` vào Axios instance frontend:

**File:** `frontend/src/lib/axios.ts`

```typescript
paramsSerializer: {
  serialize: (params: Record<string, unknown>) => {
    const parts: string[] = [];
    for (const key of Object.keys(params)) {
      const val = params[key];
      if (val === undefined || val === null) continue;
      if (Array.isArray(val)) {
        for (const item of val) {
          // Không có [] — Express 5 parse đúng thành mảng
          parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
        }
      } else if (typeof val === 'object') {
        // Object expand thành key[subkey]=val
        for (const subKey of Object.keys(val as Record<string, unknown>)) {
          const subVal = (val as Record<string, unknown>)[subKey];
          parts.push(`${encodeURIComponent(key)}[${encodeURIComponent(subKey)}]=${encodeURIComponent(String(subVal))}`);
        }
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    }
    return parts.join('&');
  }
},
```

**Kết quả:**

```
Frontend gửi:  translatedLanguage=en&translatedLanguage=vi
Express parse: { translatedLanguage: ['en', 'vi'] } ✅
```

### Tầng 2 — Backend → MangaDex (có `[]`)

Thêm `paramsSerializer` vào MangaDex client:

**File:** `backend/src/services/mangadex_client.ts`

```typescript
paramsSerializer: {
  serialize: (params: Record<string, unknown>) => {
    const parts: string[] = [];
    for (const key of Object.keys(params)) {
      const val = params[key];
      if (val === undefined || val === null) continue;
      if (Array.isArray(val)) {
        for (const item of val) {
          parts.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(String(item))}`);
        }
      } else if (typeof val === 'object') {
        for (const subKey of Object.keys(val as Record<string, unknown>)) {
          const subVal = (val as Record<string, unknown>)[subKey];
          parts.push(`${encodeURIComponent(key)}[${encodeURIComponent(subKey)}]=${encodeURIComponent(String(subVal))}`);
        }
      } else {
        parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`);
      }
    }
    return parts.join('&');
  }
},
```

**Kết quả:**

```
Backend → MangaDex:  translatedLanguage[]=en&translatedLanguage[]=vi&order[readableAt]=desc ✅
```

## Tổng kết luồng

```
Frontend ──(translatedLanguage=en)──> Backend ──(translatedLanguage[]=en)──> MangaDex
          Serializer: no brackets      Express                Serializer: with brackets
                                       parse OK ✅             Filter đúng ✅
```

---

# 🐛 Bug #2 — Manga Detail bị lỗi 400 Bad Request

## Mô tả

Khi mở trang MangaDetail, chapters không load và backend log hiển thị:

```
Get manga feed error: AxiosError: Request failed with status code 400
MangaDex API Error: {
  result: 'error',
  errors: [{
    status: 400,
    title: 'validation_exception',
    detail: 'Error validating /order: String value found, but an object is required',
  }]
}
```

URL thực tế gửi tới MangaDex:

```
/manga/{id}/feed?limit=100&offset=0&translatedLanguage[]=en&order=%5Bobject%20Object%5D
```

`%5Bobject%20Object%5D` = URL-encoded của chuỗi `[object Object]`.

Bug này **chỉ xảy ra ở Manga Detail**, không xảy ra ở Dashboard, vì Dashboard không gửi param `order` dạng object.

## Nguyên nhân

### 1. Frontend gửi `order` dạng plain object

`MangaDetail.tsx` gọi:

```typescript
useMangaFeed(mangaId, {
  limit: 200,
  translatedLanguage: chapterLanguages,
  order: { chapter: 'desc' },  // ← plain object
});
```

### 2. Frontend serializer cũ không xử lý object

Serializer cũ chỉ có 2 nhánh: `Array` và `else`. Plain object rơi vào `else`:

```typescript
// Serializer CŨ (thiếu object handling):
if (Array.isArray(val)) {
  // ...
} else {
  // { chapter: 'desc' } → String({ chapter: 'desc' }) → "[object Object]" ❌
  parts.push(`${key}=${encodeURIComponent(String(val))}`);
}
```

### 3. Backend nhận `order = "[object Object]"` (string)

Express nhận URL `?order=%5Bobject%20Object%5D`, decode thành:

```javascript
req.query.order = "[object Object]"  // ← string, không phải object
```

### 4. Controller không validate type của `order`

```typescript
// Code CŨ:
order: order as Record<string, string> || { chapter: 'desc' },
//     ↑ TypeScript cast, không runtime check
//     "[object Object]" là truthy → fallback không kích hoạt
//     Truyền string này thẳng vào MangaDex params ❌
```

### 5. MangaDex reject vì nhận string thay vì object

MangaDex validate `/order` phải là object, nhận được string `[object Object]` → 400 Bad Request.

## Giải pháp

### Fix 1 — Thêm object handling vào frontend serializer

Thêm nhánh `else if (typeof val === 'object')` trong serializer (đã áp dụng trong Tầng 1 của Bug #1):

```typescript
} else if (typeof val === 'object') {
  // { chapter: 'desc' } → order[chapter]=desc
  for (const subKey of Object.keys(val as Record<string, unknown>)) {
    const subVal = (val as Record<string, unknown>)[subKey];
    parts.push(`${encodeURIComponent(key)}[${encodeURIComponent(subKey)}]=${encodeURIComponent(String(subVal))}`);
  }
}
```

Frontend gửi: `order[chapter]=desc`

Express 5 parse `order[chapter]=desc` thành key literal `"order[chapter]"`, nên `req.query.order = undefined`.
Controller fallback `{ chapter: 'desc' }` kích hoạt đúng ✅

### Fix 2 — Type guard trong controller

**File:** `backend/src/controllers/manga_controller.ts`

```typescript
// Code MỚI — type-safe:
order: (order && typeof order === 'object' && !Array.isArray(order))
  ? order as Record<string, string>
  : { chapter: 'desc' },
```

Nếu `order` là string (bất kỳ, kể cả `"[object Object]"`), fallback `{ chapter: 'desc' }` được dùng.

## Tổng kết

| Thành phần | Vấn đề | Fix |
|---|---|---|
| Frontend Axios serializer | Không xử lý plain objects → `[object Object]` | Thêm nhánh `typeof val === 'object'` |
| Backend controller | Dùng `as` cast thay vì type check → string truthy bypass fallback | Dùng `typeof order === 'object'` guard |

---

# ⚠️ Lưu ý: Axios v1.x Breaking Change

`paramsSerializer` **phải** dùng dạng object `{ serialize: fn }`, **không** phải function trực tiếp:

```typescript
// ❌ SAI — Axios v1.x bỏ qua silently, dùng serializer mặc định
paramsSerializer: (params) => { ... }

// ✅ ĐÚNG — Axios v1.x
paramsSerializer: {
  serialize: (params) => { ... }
}
```

Nếu dùng dạng cũ, serializer bị bỏ qua hoàn toàn → `order` object serialize thành `[object Object]` → MangaDex 400.

---

# Tóm lại:
Giai đoạn	Format	Lý do
Frontend → Backend	language=en&language=vi (không [])	Express 5 parse đúng
Backend nhận	['en', 'vi'] (array)	Express tự parse
Backend → MangaDex	language[]=en&language[]=vi (có [])	MangaDex yêu cầu


# 📝 Files đã sửa

| File | Thay đổi |
|---|---|
| `frontend/src/lib/axios.ts` | Thêm `paramsSerializer: { serialize: fn }` với object handling |
| `backend/src/services/mangadex_client.ts` | Thêm `paramsSerializer: { serialize: fn }` với bracket notation |
| `backend/src/controllers/manga_controller.ts` | Type-safe guard cho `order`; bỏ hardcode `['en']` |

---

# 🧪 Test Cases

### Bug #1 — Dashboard Latest Updates
1. Mở Settings → Chọn English only
2. Về Dashboard → "Cập nhật mới nhất" chỉ hiển thị chapters EN ✅
3. Thêm Vietnamese → Hiển thị cả EN và VI ✅

### Bug #2 — Manga Detail
1. Chọn English + Vietnamese trong Settings
2. Mở trang bất kỳ manga → Chapter list load thành công (không có lỗi 400) ✅
3. Chapter list hiển thị đúng ngôn ngữ đã chọn ✅
4. Bỏ chọn Vietnamese → Chỉ còn chapters EN ✅