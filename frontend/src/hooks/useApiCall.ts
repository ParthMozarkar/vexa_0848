'use client';
import { useState, useCallback } from 'react';
import { ApiError } from '@/lib/apiClient';

export interface UseApiCallState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  status: number | null;
}

export function useApiCall<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): UseApiCallState<TResult> & {
  execute: (...args: TArgs) => Promise<TResult | null>;
  reset: () => void;
} {
  const [state, setState] = useState<UseApiCallState<TResult>>({
    data: null,
    loading: false,
    error: null,
    status: null,
  });

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setState(s => ({ ...s, loading: true, error: null }));
      try {
        const result = await fn(...args);
        setState({ data: result, loading: false, error: null, status: 200 });
        return result;
      } catch (err) {
        const isApiErr = err instanceof ApiError;
        setState({
          data: null,
          loading: false,
          error: isApiErr ? err.message : 'An unexpected error occurred',
          status: isApiErr ? err.status : null,
        });
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fn],
  );

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null, status: null });
  }, []);

  return { ...state, execute, reset };
}
