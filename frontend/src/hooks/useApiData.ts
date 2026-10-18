"use client";

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { apiErrorMessage } from '@/services/api';

interface State<T> {
  key: string;
  data?: T;
  error?: string;
}

/**
 * Loads data whenever `key` changes (or `reload()` is called).
 * `loading` is derived by comparing the finished request's key with the
 * current one, so stale data stays on screen while the next page loads.
 */
export function useApiData<T>(fetcher: () => Promise<T>, key: string) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T>>({ key: '' });
  const requestKey = `${key}#${version}`;
  const load = useEffectEvent(fetcher);

  useEffect(() => {
    let active = true;
    load()
      .then((data) => {
        if (active) setState({ key: requestKey, data });
      })
      .catch((error: unknown) => {
        if (active) setState((previous) => ({ key: requestKey, data: previous.data, error: apiErrorMessage(error) }));
      });
    return () => {
      active = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { data: state.data, error: state.error, loading: state.key !== requestKey, reload };
}
