import { useEffect, useRef, useState } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
}

/**
 * Small data-fetching hook with stale-response protection.
 * Pages use this against the mock api; it works unchanged
 * against a real fetch-based client.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true });
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true }));
    fn().then((data) => {
      if (requestId.current === id) setState({ data, loading: false });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
