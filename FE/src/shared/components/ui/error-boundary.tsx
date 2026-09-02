'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Button } from './button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  title?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lỗi giao diện bị chặn bởi ErrorBoundary:', error, errorInfo);
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        boundaryTitle: this.props.title,
      },
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[320px] w-full flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50/50 p-8 text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
            <AlertTriangle className="h-7 w-7 text-rose-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {this.props.title || 'Đã có lỗi xảy ra tại module này'}
          </h3>
          <p className="mt-1.5 max-w-md text-sm text-slate-500">
            {this.state.error?.message ||
              'Dữ liệu gặp vấn đề bất thường hoặc kết nối tạm thời bị gián đoạn. Các module khác vẫn hoạt động bình thường.'}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Tải lại trang
            </Button>
            <Button variant="default" size="sm" onClick={this.handleReset}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Thử lại module
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
