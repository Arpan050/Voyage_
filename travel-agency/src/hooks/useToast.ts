import { useCallback, useEffect, useRef, useState } from "react";

export type ToastType = "info" | "success" | "error";
export interface ToastState { msg: string; type: ToastType }

export function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const showToast = useCallback((msg: string, type: ToastType = "info") => {
    clearTimeout(timer.current);
    setToast({ msg, type });
    timer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  return { toast, showToast };
}
