export interface PollingOptions<T> {
  request: (signal: AbortSignal) => Promise<T>;
  onSuccess: (value: T) => void;
  onError: (error: unknown) => void;
  onSettled?: () => void;
  intervalMs?: number;
  isVisible: () => boolean;
}

/** One serial request batch; timer starts only after the previous batch settles. */
export function createPollingController<T>(options: PollingOptions<T>) {
  const interval = options.intervalMs ?? 10_000;
  let disposed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let controller: AbortController | undefined;
  let running: Promise<void> | undefined;
  let queued = false;

  const clearTimer = () => { clearTimeout(timer); timer = undefined; };
  const schedule = (delay: number) => {
    clearTimer();
    if (!disposed && options.isVisible()) timer = setTimeout(() => { void run(); }, delay);
  };
  const run = (): Promise<void> => {
    clearTimer();
    if (disposed || !options.isVisible()) return Promise.resolve();
    if (running) {
      queued = true;
      return running.then(() => running);
    }
    const current = new AbortController();
    controller = current;
    running = (async () => {
      try {
        const value = await options.request(current.signal);
        if (!disposed && !current.signal.aborted) options.onSuccess(value);
      } catch (error) {
        if (!disposed && !current.signal.aborted) {
          current.abort(); // Cancel siblings of a failed Promise.all batch.
          options.onError(error);
        }
      } finally {
        if (!disposed && options.isVisible()) options.onSettled?.();
      }
    })().then(() => {
      running = undefined;
      if (disposed) return;
      if (queued) { queued = false; return run(); }
      if (interval > 0) schedule(interval);
    });
    return running;
  };

  return {
    start: () => schedule(0), // StrictMode setup/cleanup cancels the first dispatch.
    refresh: run,
    visibilityChanged() {
      clearTimer();
      if (!options.isVisible()) { queued = false; controller?.abort(); }
      else void run();
    },
    dispose() { disposed = true; queued = false; clearTimer(); controller?.abort(); },
  };
}
