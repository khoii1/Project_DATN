import { useCallback, useEffect, useRef, useState } from "react";
import { createPollingController } from "../utils/polling";
import { getApiErrorMessage } from "../services/api";

interface Options<T> {
  onSuccess: (value: T) => void;
  onReset?: () => void;
  enabled?: boolean;
  intervalMs?: number;
}

/** Memoize request with useCallback: its dependencies define the polling scope. */
export function usePolling<T>(request: (signal: AbortSignal) => Promise<T>, { onSuccess, onReset, enabled = true, intervalMs = 10_000 }: Options<T>) {
  const successRef = useRef(onSuccess);
  const resetRef = useRef(onReset);
  useEffect(() => { successRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { resetRef.current = onReset; }, [onReset]);
  const refreshRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const [state, setState] = useState({ request, loading: enabled, error: "" });

  useEffect(() => {
    setState({ request, loading: enabled, error: "" });
    resetRef.current?.();
    if (!enabled) return;
    const polling = createPollingController({
      request,
      intervalMs,
      isVisible: () => !document.hidden,
      onSuccess: (value) => { successRef.current(value); setState(current => ({ ...current, error: "" })); },
      onError: (reason) => setState(current => ({ ...current, error: getApiErrorMessage(reason, "Không thể cập nhật dữ liệu. Đang giữ dữ liệu đã nhận và sẽ tự thử lại.") })),
      onSettled: () => setState(current => ({ ...current, loading: false })),
    });
    refreshRef.current = polling.refresh;
    document.addEventListener("visibilitychange", polling.visibilityChanged);
    polling.start();
    return () => {
      refreshRef.current = () => Promise.resolve();
      document.removeEventListener("visibilitychange", polling.visibilityChanged);
      polling.dispose();
    };
  }, [request, enabled, intervalMs]);

  const refresh = useCallback(() => refreshRef.current(), []);
  return { loading: enabled && (state.request !== request || state.loading), error: state.request === request ? state.error : "", refresh };
}
