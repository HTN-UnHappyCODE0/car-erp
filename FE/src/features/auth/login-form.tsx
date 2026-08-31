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
    <Card className="w-full border border-[#e8e8e8] bg-white shadow-[0_4px_20px_rgba(32,32,32,0.04)] rounded-3xl p-2.5">
      <CardHeader className="space-y-1.5 pb-4">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#202020] bg-[#efefef] w-fit px-3 py-1 rounded-full border border-[#e8e8e8]">
          <ShieldCheck className="h-3.5 w-3.5 text-[#ff682c]" />
          <span>Bảo mật JWT & RLS</span>
        </div>
        <CardTitle className="text-xl font-heading font-bold tracking-tight text-[#202020]">
          Cổng Xác Thực
        </CardTitle>
        <CardDescription className="text-xs text-[#828282] font-normal">
          Vui lòng điền thông tin tài khoản để truy cập hệ thống.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 pb-4">
          {/* Server Error Alert */}
          {serverError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="font-medium">{serverError}</span>
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#828282] ml-1">
              Tên Đăng Nhập / Email <span className="text-[#ff682c]">*</span>
            </label>
            <Input
              {...register('username')}
              type="text"
              placeholder="admin"
              icon={<User className="h-4 w-4 text-[#828282]" />}
              autoComplete="username"
              className={`h-11 text-[13px] bg-white border-[#e8e8e8] text-[#202020] placeholder:text-[#828282] rounded-xl focus:border-[#ff682c] focus:ring-[#ff682c] shadow-xs transition-all ${
                errors.username ? 'border-rose-400 focus:ring-rose-400' : ''
              }`}
            />
            {errors.username && (
              <p className="text-[11px] font-semibold text-rose-600 ml-1 mt-1">{errors.username.message}</p>
            )}
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-[#828282]">
                Mật Khẩu <span className="text-[#ff682c]">*</span>
              </label>
              <span className="text-[11px] font-medium text-[#828282] hover:text-[#ff682c] cursor-pointer hover:underline transition-all">
                Quên mật khẩu?
              </span>
            </div>
            <Input
              {...register('password')}
              type="password"
              placeholder="••••••••"
              icon={<Lock className="h-4 w-4 text-[#828282]" />}
              autoComplete="current-password"
              className={`h-11 text-[13px] bg-white border-[#e8e8e8] text-[#202020] placeholder:text-[#828282] rounded-xl focus:border-[#ff682c] focus:ring-[#ff682c] shadow-xs transition-all ${
                errors.password ? 'border-rose-400 focus:ring-rose-400' : ''
              }`}
            />
            {errors.password && (
              <p className="text-[11px] font-semibold text-rose-600 ml-1 mt-1">{errors.password.message}</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3.5 pt-2">
          <Button
            type="submit"
            className="w-full h-11 text-[13px] font-bold tracking-wide bg-[#202020] hover:bg-[#333333] text-white shadow-sm rounded-xl transition-all active:scale-[0.98]"
            isLoading={isSubmitting}
          >
            <Sparkles className="h-4 w-4 mr-2 text-[#ff682c]" />
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
