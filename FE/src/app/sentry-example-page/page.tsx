'use client';

import React, { useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/card';
import { AlertCircle, CheckCircle2, Bug, ArrowLeft, Send } from 'lucide-react';

export default function SentryExamplePage() {
  const [clientStatus, setClientStatus] = useState<string | null>(null);
  const [beStatus, setBeStatus] = useState<string | null>(null);

  const handleTriggerClientError = () => {
    try {
      setClientStatus('Đang gửi lỗi thử nghiệm lên Sentry Frontend...');
      throw new Error('Test Sentry Client Error từ Car ERP Frontend (Thử nghiệm thành công!)');
    } catch (err) {
      Sentry.captureException(err, {
        tags: {
          test: 'true',
          environment: process.env.NODE_ENV || 'development',
        },
      });
      setClientStatus('✅ Đã gửi 1 sự kiện lỗi thử nghiệm lên Sentry Frontend! Hãy kiểm tra tab Issues trên project car-erp-frontend.');
    }
  };

  const handleTriggerBackendError = async () => {
    setBeStatus('Đang gọi API /api/v1/sentry-debug trên Backend...');
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api-carerp.namhoanglegal.com/api/v1';
      const res = await fetch(`${apiUrl}/sentry-debug`);
      const data = await res.json();
      if (data.success) {
        setBeStatus('✅ Backend phản hồi: Đã gửi 1 sự kiện lỗi lên Sentry Backend (car-erp-backend) thành công!');
      } else {
        setBeStatus(`⚠️ Backend phản hồi: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      setBeStatus(`❌ Không thể gọi backend: ${(err as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] p-6 sm:p-12 flex items-center justify-center font-sans">
      <Card className="max-w-xl w-full border border-[#e8e8e8] bg-white rounded-3xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-[#e8e8e8] pb-4 bg-[#fafafa]">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-[#828282] hover:text-[#202020]">
              <ArrowLeft className="h-3.5 w-3.5" /> Về trang chủ
            </Link>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#efefef] text-[#202020]">
              Sentry Tester
            </span>
          </div>
          <CardTitle className="text-xl font-bold text-[#202020] mt-3 flex items-center gap-2">
            <Bug className="h-5 w-5 text-rose-500" />
            Kiểm Tra Kết Nối Sentry (FE & BE)
          </CardTitle>
        </CardHeader>

        <CardContent className="p-6 space-y-6 text-xs">
          <p className="text-[#828282] leading-relaxed">
            Trang này cho phép bạn kích hoạt thử các sự kiện lỗi giả lập (Test Errors) để kiểm tra xem hệ thống Sentry của bạn đã nhận được báo cáo lỗi thực tế hay chưa.
          </p>

          {/* Test Frontend */}
          <div className="p-4 rounded-2xl border border-[#e8e8e8] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#202020]">1. Thử Nghiệm Sentry Frontend</h4>
                <p className="text-[11px] text-[#828282]">Gửi một Exception từ trình duyệt về Project Sentry Next.js</p>
              </div>
              <Button
                variant="brand"
                size="sm"
                onClick={handleTriggerClientError}
                className="gap-1.5 rounded-xl shadow-xs"
              >
                <Send className="h-3.5 w-3.5" /> Bắn lỗi FE
              </Button>
            </div>
            {clientStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                {clientStatus}
              </div>
            )}
          </div>

          {/* Test Backend */}
          <div className="p-4 rounded-2xl border border-[#e8e8e8] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-[#202020]">2. Thử Nghiệm Sentry Backend</h4>
                <p className="text-[11px] text-[#828282]">Gọi endpoint /api/v1/sentry-debug để Go Backend bắn lỗi</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTriggerBackendError}
                className="gap-1.5 rounded-xl border-[#202020] text-[#202020] hover:bg-[#efefef]"
              >
                <Bug className="h-3.5 w-3.5" /> Bắn lỗi BE
              </Button>
            </div>
            {beStatus && (
              <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-medium flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-blue-600" />
                {beStatus}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
