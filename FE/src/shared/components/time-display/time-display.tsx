'use client';

import React, { useEffect, useState } from 'react';
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatDateTimeWithZone,
  formatRelativeTime,
  getUserTimeZone,
  getUserTimezoneOffsetFormatted,
  parseDateSafe,
} from '@/shared/lib/date-time';
import { cn } from '@/shared/lib/utils';

export type TimeDisplayFormat = 'date' | 'datetime' | 'time' | 'datetime-zone' | 'relative';

export interface TimeDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string | number | Date | null | undefined;
  format?: TimeDisplayFormat;
  fallback?: string;
  includeSeconds?: boolean;
  showTooltip?: boolean;
}

/**
 * Component hiển thị thời gian tự động theo múi giờ thiết bị người dùng (Client Timezone).
 * Tích hợp sẵn suppressHydrationWarning và tooltip thông tin múi giờ thực tế.
 */
export function TimeDisplay({
  value,
  format = 'datetime',
  fallback = '-',
  includeSeconds = false,
  showTooltip = true,
  className,
  ...props
}: TimeDisplayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const date = parseDateSafe(value);
  if (!date) {
    return <span className={cn('text-[#828282]', className)} {...props}>{fallback}</span>;
  }

  let formattedText = '';
  switch (format) {
    case 'date':
      formattedText = formatDate(date, { fallback });
      break;
    case 'time':
      formattedText = formatTime(date, { fallback, includeSeconds });
      break;
    case 'datetime-zone':
      formattedText = formatDateTimeWithZone(date, { fallback });
      break;
    case 'relative':
      formattedText = formatRelativeTime(date, { fallback });
      break;
    case 'datetime':
    default:
      formattedText = formatDateTime(date, { fallback, includeSeconds });
      break;
  }

  const tooltipText = showTooltip && mounted
    ? `${formatDateTime(date, { includeSeconds: true })} [${getUserTimeZone()} - ${getUserTimezoneOffsetFormatted(date)}]`
    : undefined;

  return (
    <span
      suppressHydrationWarning
      title={tooltipText}
      className={cn('inline-block tabular-nums', className)}
      {...props}
    >
      {formattedText}
    </span>
  );
}
