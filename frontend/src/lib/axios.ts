import axios from 'axios';
import type { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

interface TokenRefreshResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
  };
}

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // Express 5 uses built-in query parser which needs plain repeated keys (no [])
  // e.g. translatedLanguage=en&translatedLanguage=vi instead of translatedLanguage[]=en
  paramsSerializer: {
    serialize: (params: Record<string, unknown>) => {
      const parts: string[] = [];
      for (const key of Object.keys(params)) {
        const val = params[key];
        if (val === undefined || val === null) continue;
        if (Array.isArray(val)) {
          for (const item of val) {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(item))}`);
          }
        } else if (typeof val === 'object') {
          // Expand objects as key[subkey]=val so Express can parse them back
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
});

// Request interceptor để thêm token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Mutex để tránh gọi refresh token đồng thời
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

// Response interceptor để xử lý token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Chỉ thử refresh token nếu:
    // 1. Lỗi 401 (Unauthorized)
    // 2. Không phải request đến auth endpoints
    // 3. Chưa retry lần nào
    // 4. Có access token trong localStorage (user đã đăng nhập)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/') &&
      localStorage.getItem('accessToken')
    ) {
      originalRequest._retry = true;

      // Nếu đang refresh rồi → chờ refresh xong, dùng token mới
      if (isRefreshing) {
        return new Promise((resolve) => {
          addRefreshSubscriber((newToken: string) => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            resolve(api(originalRequest));
          });
        });
      }

      isRefreshing = true;

      try {
        const response = await api.post<TokenRefreshResponse>('/api/v1/auth/refresh-token');
        const { accessToken } = response.data.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // Thông báo cho các request đang chờ
        onRefreshed(accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        // Nếu refresh token thất bại, clear localStorage và redirect
        refreshSubscribers = [];
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Nếu là lỗi 401 tại auth endpoints, không redirect
    if (error.response?.status === 401 && originalRequest.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default api;