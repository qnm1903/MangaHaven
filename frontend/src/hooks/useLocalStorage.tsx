import { type Dispatch, type SetStateAction, useEffect, useState } from "react";

export default function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    // Kiểm tra nếu đang chạy trên client
    if (typeof window !== "undefined") {
      try {
        const item = window.localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      } catch (e) {
        console.error('[useLocalStorage] Failed to parse stored value:', e);
        return defaultValue;
      }
    }
    return defaultValue; // Giá trị mặc định khi SSR
  });

  // Sync value to localStorage when it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        console.error('[useLocalStorage] Failed to save value:', e);
      }
    }
  }, [key, value]);

  return [value, setValue];
}