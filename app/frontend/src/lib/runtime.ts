import { useCallback, useEffect, useState } from 'react';
import { Message } from '@arco-design/web-react';

export function useText<T extends Record<string, string>>(messages: T): T {
  return messages;
}

export function useApiData<T>(fetcher: () => Promise<T>, deps: ReadonlyArray<unknown> = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetcher());
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading, reload: load };
}

export function showMessage(content: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') {
  Message[type](content);
}
