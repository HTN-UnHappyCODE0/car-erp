'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AxiosError } from 'axios';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/shared/components/ui/card';
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
    <Card className="w-full rounded-3xl border border-[#e8e8e8] bg-white p-2.5 shadow-[0_4px_20px_rgba(32,32,32,0.04)]">
      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex w-fit items-center gap-1.5 rounded-full border border-[#e8e8e8] bg-[#efefef] px-3 py-1 text-xs font-semibold text-[#202020]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#ff682c]" />
          <span>Bảo mật JWT & RLS</span>
        </div>
        <CardTitle className="font-heading text-xl font-bold tracking-tight text-[#202020]">
          Cổng Xác Thực LOGIN
        </CardTitle>
        <CardDescription className="text-xs font-normal text-[#828282]">
          Vui lòng điền thông tin tài khoản để truy cập hệ thống.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pb-4">
          {/* Server Error Alert */}
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="font-medium">{serverError}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="ml-1 text-[11px] font-semibold tracking-wider text-[#828282] uppercase">
              Tên Đăng Nhập / Email <span className="text-[#ff682c]">*</span>
            </label>
            <Input
              {...register('username')}
              type="text"
              placeholder="admin"
              icon={<User className="h-4 w-4 text-[#828282]" />}
              autoComplete="username"
              className={`h-11 rounded-xl border-[#e8e8e8] bg-white text-[13px] text-[#202020] shadow-xs transition-all placeholder:text-[#828282] focus:border-[#ff682c] focus:ring-[#ff682c] ${
                errors.username ? 'border-rose-400 focus:ring-rose-400' : ''
              }`}
            />
            {errors.username && (
              <p className="mt-1 ml-1 text-[11px] font-semibold text-rose-600">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="ml-1 flex items-center justify-between">
              <label className="text-[11px] font-semibold tracking-wider text-[#828282] uppercase">
                Mật Khẩu <span className="text-[#ff682c]">*</span>
              </label>
              <span className="cursor-pointer text-[11px] font-medium text-[#828282] transition-all hover:text-[#ff682c] hover:underline">
                Quên mật khẩu?
              </span>
            </div>
            <Input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4 text-[#828282]" />}
              autoComplete="current-password"
              className={`h-11 rounded-xl border-[#e8e8e8] bg-white text-[13px] text-[#202020] shadow-xs transition-all placeholder:text-[#828282] focus:border-[#ff682c] focus:ring-[#ff682c] ${
                errors.password ? 'border-rose-400 focus:ring-rose-400' : ''
              }`}
            />
            {errors.password && (
              <p className="mt-1 ml-1 text-[11px] font-semibold text-rose-600">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3.5 pt-2">
          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-[#202020] text-[13px] font-bold tracking-wide text-white shadow-sm transition-all hover:bg-[#333333] active:scale-[0.98]"
            isLoading={isSubmitting}
          >
            <Sparkles className="mr-2 h-4 w-4 text-[#ff682c]" />
            Đăng Nhập
          </Button>

          <p className="text-center text-[10px] font-normal text-[#828282]">
            Hệ thống được bảo vệ bởi xác thực JWT & phân quyền đa chi nhánh.
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
