# Bug Fix: Phải đăng nhập 2 lần khi Refresh Token hết hạn

> **Ngày:** 2026-02-15  
> **File liên quan:** `frontend/src/store/authAtoms.ts`, `frontend/src/lib/axios.ts`  
> **Mức độ:** Critical — ảnh hưởng trực tiếp UX đăng nhập

---

## Mô tả lỗi

Khi refresh token (cookie `refreshToken`) hết hạn, user bị redirect về trang `/auth`.
Tuy nhiên, **lần đăng nhập đầu tiên** (qua Google hoặc email/password) **thất bại âm thầm**, và user phải đăng nhập **lần thứ 2** mới thành công.

Biểu hiện trong terminal: lỗi `Refresh token required` xuất hiện **2 lần liên tiếp**.

---

## Phân tích nguyên nhân gốc (Root Cause)

### Luồng xử lý trước khi sửa

Khi app khởi động, `AuthProvider` mount và trigger `initializeAuthAtom`. Hàm này kiểm tra session cũ trong `localStorage` và cố gắng làm mới access token:

```
App mount
  → AuthProvider mount
    → initializeAuthAtom() chạy
      → AuthService.refreshToken()  // Gọi POST /auth/refresh-token
```

**Khi refresh token đã hết hạn, chuỗi lỗi xảy ra như sau:**

### Bước 1: initializeAuthAtom gọi refresh → Fail lần 1

```
initializeAuthAtom
  → AuthService.refreshToken()
    → POST /auth/refresh-token
    → Backend: cookie refreshToken không có/hết hạn
    → Response: 401 "Refresh token required"     ← LỖI LẦN 1
```

### Bước 2: Code rơi vào catch → gọi AuthService.logout()

Trong `catch` block, code kiểm tra `hadStoredSession = true` (vì `localStorage` vẫn còn `accessToken` cũ),
rồi gọi `AuthService.logout()`:

```
catch block
  → hadStoredSession = true (localStorage vẫn có accessToken cũ)
  → AuthService.logout()
    → POST /auth/logout (qua axios instance `api`)
```

### Bước 3: Axios interceptor can thiệp → Fail lần 2

Request logout đi qua axios instance `api` (trong `frontend/src/lib/axios.ts`).
Backend trả 401 cho request logout (vì không có token hợp lệ).
**Axios response interceptor** bắt lỗi 401 này và cố gắng tự động refresh token:

```
Axios interceptor nhận 401 từ /auth/logout
  → Kiểm tra: status === 401? ✓
  → Kiểm tra: !_retry? ✓
  → Kiểm tra: !url.includes('/auth/')? ✗ → URL là /auth/logout → CHỨA '/auth/'
```

**Nhưng khoan!** URL `/api/v1/auth/logout` **chứa** `/auth/`, nên interceptor **KHÔNG** retry.
Vậy lỗi lần 2 đến từ đâu?

### Bước 4: finally block gây redirect → Page reload → initializeAuthAtom chạy lại

Dù logout thành công hay thất bại, `finally` block luôn chạy:

```typescript
finally {
  set(authStateAtom, { user: null, token: null, loading: false });
  window.location.href = '/auth';  // ← HARD REDIRECT, FULL PAGE RELOAD
}
```

`window.location.href = '/auth'` gây **full page reload**:
- `AuthProvider` mount lại
- `initializeAuthAtom` chạy **LẦN NỮA**
- Lúc này `localStorage` đã bị `finally` block xoá sạch
- `hadStoredSession = false` → không gọi logout nữa → kết thúc bình thường
- User thấy trang login

### Bước 5: User đăng nhập → Race condition

User đăng nhập Google thành công:
- Backend trả về `accessToken` mới + set cookie `refreshToken` mới
- `loginAtom` lưu token mới vào `localStorage` và cập nhật state

**NHƯNG:** Timing của `initializeAuthAtom` (từ page reload ở bước 4) có thể **chưa hoàn thành**
khi user đã submit login. Kết quả:
- `initializeAuthAtom` đang chạy → cố refresh token → fail → xoá localStorage **LẦN NỮA**
- Token mới vừa được `loginAtom` lưu vào bị **ghi đè bởi null**
- User phải đăng nhập lần 2

---

## Giải pháp

### Thay đổi trong `frontend/src/store/authAtoms.ts`

**Trước:**
```typescript
if (hadStoredSession) {
  try {
    await AuthService.logout();    // ← Gọi network, trigger side effects
  } catch (logoutError) {
    console.error('Logout during initialization failed:', logoutError);
  } finally {
    set(authStateAtom, previousState => ({
      ...previousState,
      user: null,
      token: null,
      loading: false,
    }));
    window.location.href = '/auth'; // ← Hard redirect, gây page reload
  }
  return;
}
```

**Sau:**
```typescript
if (hadStoredSession) {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  set(authStateAtom, previousState => ({
    ...previousState,
    user: null,
    token: null,
    loading: false,
  }));
  return;
}
```

### Lý do

| Vấn đề | Giải pháp |
|---------|-----------|
| `AuthService.logout()` gọi network thừa | Token đã hết hạn server-side, không cần gọi backend để invalidate |
| Axios interceptor can thiệp | Không gọi network → không có interceptor side effects |
| `window.location.href` gây page reload | Bỏ hard redirect, để router/auth guard tự xử lý redirect |
| Race condition giữa init và login | Không reload page → không re-trigger initializeAuthAtom |

### Tại sao không cần gọi logout?

Refresh token đã **hết hạn** trên server, nghĩa là nó **đã bị invalidate tự động**.
Gọi `AuthService.logout()` để yêu cầu server invalidate token là **thừa** và chỉ gây thêm side effects.

### Tại sao không cần hard redirect?

App đã có `AuthGuard` component kiểm tra `user === null`.
Khi state được reset về `{ user: null, token: null }`, các route được bảo vệ sẽ tự redirect về `/auth`.
Điều này xảy ra **trong cùng React lifecycle**, không cần full page reload.

---

## Cách test

1. Đăng nhập bình thường
2. Mở DevTools → **Application → Cookies** → Xoá cookie `refreshToken`
3. Reload trang → phải thấy trang login (không redirect loop)
4. Đăng nhập Google → **phải OK ngay lần đầu**
5. Check terminal backend: lỗi `Refresh token required` chỉ xuất hiện **1 lần** (không còn 2 lần)

---
---

# Bug Fix: Prisma P2025 — Refresh Token Rotation Race Condition

> **Ngày:** 2026-02-15  
> **File liên quan:** `backend/src/services/auth_service.ts`  
> **Mức độ:** Critical — gây 500 Internal Server Error khi refresh token

---

## Mô tả lỗi

Khi user đã đăng nhập, đôi khi backend trả lỗi 500 với message:

```
PrismaClientKnownRequestError (P2025):
Invalid `prisma.refreshToken.update()` invocation
An operation failed because it depends on one or more records that were required but not found.
No record was found for an update.
```

Lỗi xảy ra tại `auth_service.ts:188` — hàm `AuthService.refreshToken()`.

---

## Phân tích nguyên nhân gốc (Root Cause)

### Token rotation hoạt động thế nào

Khi frontend gọi `/auth/refresh-token`, backend thực hiện **token rotation** — đổi refresh token cũ thành token mới:

```
1. Tìm token cũ trong DB         → prisma.refreshToken.findUnique({ where: { token: oldToken } })
2. Verify token hợp lệ + chưa hết hạn
3. Tạo access token mới + refresh token mới
4. CẬP NHẬT record cũ thành token mới → prisma.refreshToken.update({ where: { token: oldToken }, ... })
```

### Race condition xảy ra khi nào

Khi **2 request đồng thời** cùng gửi refresh token:

```
Request A: POST /auth/refresh-token (token = "abc123")
Request B: POST /auth/refresh-token (token = "abc123")  ← cùng token

Timeline:
  t1: Request A → findUnique("abc123") → tìm thấy ✓
  t2: Request B → findUnique("abc123") → tìm thấy ✓ (chưa bị đổi)
  t3: Request A → update("abc123" → "xyz789") → THÀNH CÔNG ✓ (token giờ là "xyz789")
  t4: Request B → update("abc123" → "def456") → LỖI P2025 ✗ (token "abc123" không còn tồn tại!)
```

### Tại sao có 2 request đồng thời?

Trong `initializeAuthAtom`, sau khi refresh token thành công, code ngay lập tức gọi `getProfile()`:

```typescript
const { accessToken } = await AuthService.refreshToken();  // ← Request 1
const profile = await AuthService.getProfile();             // ← Dùng access token mới
```

Ngoài ra, axios interceptor cũng có thể tự động gọi refresh khi phát hiện 401, tạo ra request thứ 2 song song.

---

## Giải pháp

### Thay đổi trong `backend/src/services/auth_service.ts`

**Trước:**
```typescript
const expirationTime = JWTUtils.getExpirationTime(newRefreshToken);
await prisma.refreshToken.update({
  where: { token: refreshToken },
  data: {
    token: newRefreshToken,
    expiresAt: new Date(expirationTime! * 1000),
  }
});
```

**Sau:**
```typescript
const expirationTime = JWTUtils.getExpirationTime(newRefreshToken);

// Use delete + create instead of update to avoid P2025 race condition
await prisma.refreshToken.deleteMany({
  where: { token: refreshToken },
});

await prisma.refreshToken.create({
  data: {
    token: newRefreshToken,
    userId: payload.userId,
    expiresAt: new Date(expirationTime! * 1000),
  }
});
```

### Tại sao `deleteMany` + `create` thay vì `update`?

| Method | Khi record không tồn tại |
|--------|--------------------------|
| `prisma.refreshToken.update()` | **Throw P2025** — crash server |
| `prisma.refreshToken.deleteMany()` | **Trả về `{ count: 0 }`** — không crash |

- `deleteMany` xoá token cũ nếu còn — nếu không còn (đã bị request khác xoá) thì bỏ qua
- `create` tạo token mới hoàn toàn — không phụ thuộc record cũ
- Kết quả: request chậm hơn vẫn tạo token mới thành công, không crash

---
---

# Bug Fix: P2002 — Concurrent Refresh Token tạo JWT trùng lặp

> **Ngày:** 2026-02-15  
> **File liên quan:** `backend/src/utils/jwt.ts`, `frontend/src/lib/axios.ts`, `frontend/src/store/authAtoms.ts`  
> **Mức độ:** Critical — gây 500 Internal Server Error

---

## Mô tả lỗi

Backend crash với lỗi Prisma P2002:

```
PrismaClientKnownRequestError:
Invalid `prisma.refreshToken.create()` invocation
Unique constraint failed on the fields: (`token`)
```

---

## Phân tích nguyên nhân gốc (Root Cause)

### Tại sao có 2 request refresh đồng thời?

**Nguồn 1 — React Strict Mode (dev only):**

React Strict Mode gọi `useEffect` 2 lần trong development:

```
AuthProvider mount
  → useEffect #1: initializeAuthAtom() → refreshToken()  ← lần 1
  → useEffect #2: initializeAuthAtom() → refreshToken()  ← lần 2 (Strict Mode)
```

**Nguồn 2 — Axios interceptor + initializeAuthAtom song song:**

Khi access token hết hạn, các API call khác nhận 401 → axios interceptor gọi refresh → chạy song song với `initializeAuthAtom`.

### Tại sao 2 request tạo ra JWT giống hệt nhau?

JWT = `header.payload.signature`. Với:
- Cùng payload (`userId`, `email`, `role`)
- Cùng giây `iat` (JWT dùng seconds, không phải milliseconds)
- Cùng secret key

→ **Kết quả là chuỗi JWT giống 100%**.

### Chuỗi lỗi

```
t1: Request A → deleteMany("oldToken") → xoá thành công
t2: Request B → deleteMany("oldToken") → 0 rows (đã bị A xoá), nhưng không lỗi
t3: Request A → create("newToken_XYZ") → thành công ✓
t4: Request B → create("newToken_XYZ") → LỖI P2002 ✗ (token giống hệt, vi phạm unique)
```

---

## Giải pháp (3 tầng)

### Tầng 1: Backend — JWT luôn unique (`backend/src/utils/jwt.ts`)

Thêm `jti` (JWT ID) = UUID ngẫu nhiên vào refresh token:

```diff
  static generateRefreshToken(payload) {
-   return jwt.sign(payload, secret, { expiresIn });
+   return jwt.sign({ ...payload, jti: crypto.randomUUID() }, secret, { expiresIn });
  }
```

→ Mỗi token có UUID riêng, **không bao giờ trùng** dù tạo cùng giây.

### Tầng 2: Frontend — Mutex cho refresh (`frontend/src/lib/axios.ts`)

Thêm `isRefreshing` flag + subscriber queue:

```typescript
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

// Trong interceptor:
if (isRefreshing) {
  // Chờ refresh xong, dùng token mới
  return new Promise((resolve) => {
    addRefreshSubscriber((newToken) => {
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
      resolve(api(originalRequest));
    });
  });
}
isRefreshing = true;
// ... gọi refresh ...
onRefreshed(accessToken); // thông báo cho các request đang chờ
isRefreshing = false;
```

→ Chỉ **1 request refresh** được gửi, các request khác chờ kết quả.

### Tầng 3: Frontend — initializeAuthAtom chạy 1 lần (`frontend/src/store/authAtoms.ts`)

Thêm guard bằng module-level promise:

```typescript
let initPromise: Promise<void> | null = null;

export const initializeAuthAtom = atom(null, async (_get, set) => {
  if (initPromise) return initPromise; // đã chạy → trả promise cũ

  initPromise = (async () => {
    // ... toàn bộ logic init ...
  })();

  return initPromise;
});
```

→ React Strict Mode gọi 2 lần nhưng logic chỉ chạy **1 lần duy nhất**.

---

## Tổng kết 3 tầng bảo vệ

| Tầng | File | Chống |
|------|------|-------|
| Backend: `jti` UUID | `jwt.ts` | 2 JWT trùng nhau |
| Frontend: Mutex | `axios.ts` | 2 refresh request song song từ interceptor |
| Frontend: Guard | `authAtoms.ts` | Strict Mode gọi init 2 lần |
