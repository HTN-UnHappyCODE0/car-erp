/**
 * Thư viện xử lý và định dạng thời gian tự động theo múi giờ thiết bị của người dùng (Device Timezone).
 * Đảm bảo hiển thị chính xác giờ thực tế theo vị trí địa lý của khách hàng/người dùng.
 */

/**
 * Lấy múi giờ IANA thực tế của thiết bị người dùng (VD: 'Asia/Ho_Chi_Minh', 'Asia/Tokyo', 'America/New_York')
 */
export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';
  } catch {
    return 'Asia/Ho_Chi_Minh';
  }
}

/**
 * Lấy định dạng độ lệch múi giờ (VD: 'GMT+7', 'GMT+9', 'GMT-5')
 */
export function getUserTimezoneOffsetFormatted(date: Date = new Date(), timeZone?: string): string {
  try {
    const tz = timeZone || getUserTimeZone();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find((p) => p.type === 'timeZoneName');
    return tzPart ? tzPart.value : 'GMT+7';
  } catch {
    const offsetMin = -date.getTimezoneOffset();
    const sign = offsetMin >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offsetMin) / 60);
    return `GMT${sign}${hours}`;
  }
}

/**
 * Chuyển đổi an toàn chuỗi ngày giờ từ Backend (ISO 8601, UTC, Date-only, v.v.) sang đối tượng Date chuẩn
 */
export function parseDateSafe(dateInput: string | number | Date | null | undefined): Date | null {
  if (dateInput === null || dateInput === undefined || dateInput === '') {
    return null;
  }

  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? null : dateInput;
  }

  if (typeof dateInput === 'number') {
    const d = new Date(dateInput);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(dateInput).trim();
  if (!str) return null;

  // Trường hợp chuỗi chỉ có ngày: "YYYY-MM-DD"
  // Parse trực tiếp theo năm, tháng, ngày để tránh bị nhảy lùi ngày do UTC Midnight
  const dateOnlyMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const [, y, m, d] = dateOnlyMatch;
    const localDate = new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
    return isNaN(localDate.getTime()) ? null : localDate;
  }

  // Chuỗi ISO có dấu cách thay vì T: "2026-08-31 14:45:03"
  let normalizedStr = str;
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}/.test(str)) {
    normalizedStr = str.replace(' ', 'T');
  }

  // Nếu chuỗi ISO không có thông tin timezone (không có Z hoặc +/- offset), mặc định coi là UTC từ Backend
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(normalizedStr)) {
    normalizedStr += 'Z';
  }

  const parsed = new Date(normalizedStr);
  return isNaN(parsed.getTime()) ? null : parsed;
}

export interface FormatDateOptions {
  timeZone?: string;
  locale?: string;
  fallback?: string;
}

/**
 * Định dạng Ngày + Giờ theo múi giờ thiết bị (Mặc định: 'dd/MM/yyyy HH:mm')
 * Ví dụ: 31/08/2026 21:45
 */
export function formatDateTime(
  dateInput: string | number | Date | null | undefined,
  options: FormatDateOptions & { includeSeconds?: boolean } = {}
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return options.fallback ?? '-';

  const tz = options.timeZone || getUserTimeZone();
  const locale = options.locale || 'vi-VN';

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: options.includeSeconds ? '2-digit' : undefined,
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const day = getPart('day');
    const month = getPart('month');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = options.includeSeconds ? `:${getPart('second')}` : '';

    return `${day}/${month}/${year} ${hour}:${minute}${second}`;
  } catch {
    // Fallback cơ bản nếu Intl gặp lỗi
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

/**
 * Định dạng Ngày theo múi giờ thiết bị (Mặc định: 'dd/MM/yyyy')
 * Ví dụ: 31/08/2026
 */
export function formatDate(
  dateInput: string | number | Date | null | undefined,
  options: FormatDateOptions = {}
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return options.fallback ?? '-';

  const tz = options.timeZone || getUserTimeZone();
  const locale = options.locale || 'vi-VN';

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    return `${getPart('day')}/${getPart('month')}/${getPart('year')}`;
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  }
}

/**
 * Định dạng Giờ:Phút theo múi giờ thiết bị
 * Ví dụ: 14:30 hoặc 14:30:45
 */
export function formatTime(
  dateInput: string | number | Date | null | undefined,
  options: FormatDateOptions & { includeSeconds?: boolean } = {}
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return options.fallback ?? '-';

  const tz = options.timeZone || getUserTimeZone();
  const locale = options.locale || 'vi-VN';

  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      second: options.includeSeconds ? '2-digit' : undefined,
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '';

    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = options.includeSeconds ? `:${getPart('second')}` : '';

    return `${hour}:${minute}${second}`;
  } catch {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
}

/**
 * Định dạng Ngày Giờ kèm ký hiệu Múi giờ thực tế của thiết bị
 * Ví dụ: 31/08/2026 21:45 (GMT+7)
 */
export function formatDateTimeWithZone(
  dateInput: string | number | Date | null | undefined,
  options: FormatDateOptions = {}
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return options.fallback ?? '-';

  const formatted = formatDateTime(date, options);
  const offset = getUserTimezoneOffsetFormatted(date, options.timeZone);
  return `${formatted} (${offset})`;
}

/**
 * Hiển thị thời gian tương đối thân thiện (VD: "Vừa xong", "5 phút trước", "2 giờ trước", "Hôm qua", "3 ngày trước")
 */
export function formatRelativeTime(
  dateInput: string | number | Date | null | undefined,
  options: { locale?: string; fallback?: string } = {}
): string {
  const date = parseDateSafe(dateInput);
  if (!date) return options.fallback ?? '-';

  const now = new Date();
  const diffInSeconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 45) return 'Vừa xong';
  if (diffInSeconds < 90) return '1 phút trước';

  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;

  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays === 1) return 'Hôm qua';
  if (diffInDays < 30) return `${diffInDays} ngày trước`;

  const diffInMonths = Math.round(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths} tháng trước`;

  return formatDate(date);
}
