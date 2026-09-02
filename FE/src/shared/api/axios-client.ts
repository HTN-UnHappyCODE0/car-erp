import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as Sentry from '@sentry/nextjs';
import { API_BASE_URL } from '@/shared/config/constants';
import { useAuthStore } from '@/shared/store/auth-store';

// Khởi tạo instance axios
export const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// 1. Request Interceptor: Lấy accessToken từ useAuthStore và gắn vào header Authorization: Bearer ...
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// 2. Response Interceptor: Xử lý Silent Refresh Token
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error: AxiosError) => {
    if (!error.response) {
      Sentry.addBreadcrumb({
        category: 'network',
        message: 'Network error connecting to Backend API',
        level: 'warning',
      });
      return Promise.reject(
        new Error('Không thể kết nối đến máy chủ ERP Go. Vui lòng kiểm tra kết nối mạng.')
      );
    }

    const { status, config } = error.response;
    const originalRequest = config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthLogin = originalRequest?.url?.includes('/auth/login');
    const isAuthRenew = originalRequest?.url?.includes('/auth/renew');

    // Ghi nhận breadcrumb lỗi API vào Sentry
    if (status >= 500) {
      Sentry.addBreadcrumb({
        category: 'api',
        message: `API Error ${status} on ${originalRequest?.url}`,
        level: 'error',
        data: {
          url: originalRequest?.url,
          method: originalRequest?.method,
          status,
        },
      });
    }

    // Nếu lỗi 401 và không phải đang login hay đang renew
    if (status === 401 && !isAuthLogin && !isAuthRenew && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh, đưa các request khác vào hàng đợi
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;

      if (!refreshToken) {
        useAuthStore.getState().clearAuth();
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Gọi API renew token
        const res = await axios.post(`${API_BASE_URL}/auth/renew`, {
          refresh_token: refreshToken,
        });
        
        // Cấu trúc response từ Go API: { data: { access_token: "..." } }
        const newAccessToken = res.data?.data?.access_token;
        
        if (newAccessToken) {
          useAuthStore.getState().setAccessToken(newAccessToken);
          processQueue(null, newAccessToken);
          
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosClient(originalRequest);
        } else {
          throw new Error('Không nhận được access_token mới');
        }
      } catch (renewError) {
        processQueue(renewError, null);
        useAuthStore.getState().clearAuth();
        
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/login';
        }
        return Promise.reject(renewError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
