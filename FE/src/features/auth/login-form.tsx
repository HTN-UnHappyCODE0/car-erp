'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/shared/components/ui/card';
import { useAuthStore, AuthUser } from '@/shared/store/auth-store';
import { axiosClient } from '@/shared/api/axios-client';
import { ApiResponse } from '@/shared/types/api';
import { User, Lock, AlertCircle, Sparkles, ShieldCheck } from 'lucide-react';

// 1. Zod Schema Validation
export const loginSchema = z.object({
  username: z
    .string()
    .min(1, 'Tên đăng nhập hoặc Email không được để trống')
    .min(3, 'Tên đăng nhập phải có tối thiểu 3 ký tự'),
  password: z
    .string()
    .min(1, 'Mật khẩu không được để trống')
    .min(4, 'Mật khẩu phải có tối thiểu 4 ký tự'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const setAuth = useAuthStore((s) => s.setAuth);
  const [serverError, setServerError] = useState<string | null>(null);

  // 2. React Hook Form kết hợp Zod Resolver
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: '',
    },
  });

  // 3. Xử lý Submit & Gọi API /api/v1/auth/login
  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);

    try {
      const res: ApiResponse<{
        session_id: string;
        access_token: string;
        refresh_token: string;
        user: AuthUser;
      }> = await axiosClient.post('/auth/login', {
        username: data.username.trim(),
        password: data.password.trim(),
      });

      if (res.data) {
        setAuth(res.data.user, res.data.access_token, res.data.refresh_token);
        router.push(redirectUrl);
      } else {
        throw new Error(res.message || 'Đăng nhập không thành công');
      }
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string; error?: string }>;
      const msg =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        axiosErr.message ||
        'Tên đăng nhập hoặc mật khẩu không chính xác.';
      setServerError(msg);
    }
  };

  return (
    <Card className="w-full border border-slate-200/60 bg-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl rounded-3xl p-2">
      <CardHeader className="space-y-1.5 pb-5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 bg-indigo-50 w-fit px-2.5 py-1 rounded-full">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Xác Thực An Toàn</span>
        </div>
        <CardTitle className="text-xl font-extrabold tracking-tight text-slate-800">
          Đăng Nhập Cổng ERP
        </CardTitle>
        <CardDescription className="text-xs text-slate-500 font-medium">
          Vui lòng điền thông tin tài khoản để tiếp tục.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pb-4">
          {/* Server Error Alert */}
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600 shadow-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{serverError}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
              Tên Đăng Nhập / Email <span className="text-red-500">*</span>
            </label>
            <Input
              {...register('username')}
              type="text"
              placeholder="VD: admin, sales_hanoi..."
              icon={<User className="h-4 w-4 text-slate-400" />}
              autoComplete="username"
              className={`h-11 text-[13px] bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl focus:border-indigo-400 focus:ring-indigo-400/20 shadow-sm transition-all ${
                errors.username ? 'border-red-400 focus:ring-red-400' : ''
              }`}
            />
            {errors.username && (
              <p className="text-[11px] font-semibold text-red-500 ml-1 mt-1">{errors.username.message}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Mật Khẩu <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-semibold text-indigo-500 cursor-pointer hover:text-indigo-600 hover:underline transition-all">
                Quên mật khẩu?
              </span>
            </div>
            <Input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4 text-slate-400" />}
              autoComplete="current-password"
              className={`h-11 text-[13px] bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-2xl focus:border-indigo-400 focus:ring-indigo-400/20 shadow-sm transition-all ${
                errors.password ? 'border-red-400 focus:ring-red-400' : ''
              }`}
            />
            {errors.password && (
              <p className="text-[11px] font-semibold text-red-500 ml-1 mt-1">{errors.password.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full h-11 text-[13px] font-bold tracking-wide bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 rounded-2xl transition-all active:scale-[0.98]"
            isLoading={isSubmitting}
          >
            <Sparkles className="h-4 w-4 mr-2 opacity-80" />
            Đăng Nhập Hệ Thống
          </Button>

          <p className="text-center text-[10px] font-medium text-slate-400">
            Hệ thống được bảo vệ bởi xác thực JWT & phân quyền đa chi nhánh.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
