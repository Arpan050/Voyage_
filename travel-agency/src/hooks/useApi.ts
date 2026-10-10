import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "../api/client";

interface UseApi<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Re-run the request (e.g. after a mutation). */
  reload: () => Promise<void>;
}

/**
 * Runs `fn` on mount and whenever `deps` change (deps must be JSON-serialisable
 * primitives such as ids, filters and page numbers). Stale responses are ignored,
 * so fast filter changes can't show results from an older request.
 */
export function useApi<T>(fn: () => Promise<T>, deps: readonly (string | number | boolean | null | undefined)[]): UseApi<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const fnRef = useRef(fn);

  useEffect(() => { fnRef.current = fn; });

  const reload = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fnRef.current();
      if (id === latest.current) setData(result);
    } catch (e) {
      if (id === latest.current) setError(errorMessage(e));
    } finally {
      if (id === latest.current) setLoading(false);
    }
  }, []);

  const key = JSON.stringify(deps);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
    // Invalidate any in-flight request when deps change or the component unmounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => { latest.current++; };
  }, [reload, key]);

  return { data, loading, error, reload };
}
