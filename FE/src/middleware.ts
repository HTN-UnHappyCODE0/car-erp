import { NextResponse, type NextRequest } from 'next/server';

// Danh sách các route công khai không cần đăng nhập
const PUBLIC_ROUTES = ['/login', '/favicon.ico', '/robots.txt'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Đọc Access Token từ Cookie
  const token = req.cookies.get('car_erp_token')?.value;

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.');

  // Bỏ qua các file tĩnh và API routes nội bộ
  if (isStaticAsset) {
    return NextResponse.next();
  }

  // 2. Chốt chặn 1: Chưa đăng nhập mà truy cập vào Dashboard hoặc các phân hệ ERP
  if (!token && !isPublicRoute) {
    const loginUrl = new URL('/login', req.url);
    // Lưu lại URL người dùng muốn truy cập để redirect lại sau khi login
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Chốt chặn 2: Đã đăng nhập mà quay lại trang /login -> tự động đưa vào Dashboard
  if (token && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

// Cấu hình matcher áp dụng middleware
export const config = {
  matcher: [
    /*
     * Khớp tất cả các request paths trừ các file tĩnh:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
