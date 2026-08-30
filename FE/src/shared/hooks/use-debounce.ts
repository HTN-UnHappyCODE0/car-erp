'use client';

import { useState, useEffect } from 'react';

/**
 * Custom Hook trì hoãn cập nhật giá trị đầu vào (Debounce)
 * @param value Giá trị cần debounce (search query, input string...)
 * @param delay Thời gian trì hoãn (mặc định 400ms)
 */
export function useDebounce<T>(value: T, delay = 400): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
