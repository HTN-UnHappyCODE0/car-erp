import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center p-6 text-center bg-[#efefef] text-[#202020]">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-[#ff682c] mb-4 border border-[#e8e8e8] shadow-xs">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h2 className="text-3xl font-heading font-bold tracking-tight text-[#202020]">404 - Không Tìm Thấy Trang</h2>
      <p className="mt-2 max-w-md text-xs text-[#828282] font-medium">
        Đường dẫn bạn yêu cầu không tồn tại hoặc bạn không có quyền truy cập vào phân hệ này.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="default" className="rounded-full shadow-xs bg-[#202020] text-white hover:bg-[#333333]">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Quay Về Bảng Điều Khiển
          </Button>
        </Link>
      </div>
    </div>
  );
}
