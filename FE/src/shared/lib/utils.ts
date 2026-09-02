import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import DOMPurify from 'isomorphic-dompurify';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export toàn bộ module date-time theo chuẩn múi giờ thiết bị người dùng
export {
  getUserTimeZone,
  getUserTimezoneOffsetFormatted,
  parseDateSafe,
  formatDateTime,
  formatDate,
  formatTime,
  formatDateTimeWithZone,
  formatRelativeTime,
  type FormatDateOptions,
} from './date-time';

/**
 * Định dạng tiền tệ VND chuẩn Việt Nam (ví dụ: 1.250.000.000 ₫)
 */
export function formatVND(amount: number | string | undefined | null): string {
  if (amount === undefined || amount === null || amount === '') return '0 ₫';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0 ₫';

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Định dạng số VIN xe (in hoa, tách 3 nhóm)
 */
export function formatVIN(vin: string | undefined | null): string {
  if (!vin) return '-';
  return vin.toUpperCase().trim();
}

/**
 * Định dạng số điện thoại Việt Nam
 */
export function formatPhone(phone: string | undefined | null): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Làm sạch mã HTML nguy hiểm (XSS Protection)
 */
export function sanitizeHtml(dirtyHtml: string | undefined | null): string {
  if (!dirtyHtml) return '';
  return DOMPurify.sanitize(dirtyHtml);
}
