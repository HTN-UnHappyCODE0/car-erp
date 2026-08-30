import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-6 text-center bg-slate-50 text-slate-800">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4 border border-indigo-100 shadow-sm">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">404 - Không Tìm Thấy Trang</h2>
      <p className="mt-2 max-w-md text-sm text-slate-500 font-medium">
        Đường dẫn bạn yêu cầu không tồn tại hoặc bạn không có quyền truy cập vào phân hệ này.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="brand" className="rounded-xl shadow-sm">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Quay Về Bảng Điều Khiển
          </Button>
        </Link>
      </div>
    </div>
  );
}
