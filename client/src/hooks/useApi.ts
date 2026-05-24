import { useState, useCallback } from 'react';
import type { ApiResponse } from '@shared/types';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T = unknown>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const request = useCallback(async (url: string, options?: RequestInit): Promise<ApiResponse<T> | null> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const password = sessionStorage.getItem('auth_password') || '';
    try {
      const res = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'x-auth-password': password,
          ...(options?.headers || {}),
        },
      });
      const json: ApiResponse<T> = await res.json();
      if (!json.success) {
        setState(prev => ({ ...prev, loading: false, error: json.error || 'Unknown error' }));
        return null;
      }
      setState({ data: json.data ?? null, loading: false, error: null });
      return json;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      setState({ data: null, loading: false, error: message });
      return null;
    }
  }, []);

  return { ...state, request };
}
