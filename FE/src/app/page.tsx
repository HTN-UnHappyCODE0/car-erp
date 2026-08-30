import { redirect } from 'next/navigation';

/**
 * Trang root `/` — Tự động chuyển hướng sang Dashboard ERP.
 * Middleware bảo vệ route này, nếu chưa đăng nhập sẽ bị đưa về /login trước.
 */
export default function RootPage() {
  redirect('/inventory');
}
