interface WatchdogOptions {
  check: () => Promise<{ count: number }>;
  intervalMs: number;
  info: (count: number) => void;
  warn: (error: unknown) => void;
}

/** Idempotent lifecycle and serial DB checks. Multiple processes remain SQL-safe. */
export function createPresenceWatchdog(options: WatchdogOptions) {
  let stopped = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: Promise<void> | undefined;
  const schedule = (delay: number) => { timer = setTimeout(() => { void tick(); }, delay); };
  const tick = (): Promise<void> => {
    if (stopped || running) return running ?? Promise.resolve();
    running = (async () => {
      try {
        const result = await options.check();
        if (result.count > 0) options.info(result.count);
      } catch (error) { options.warn(error); }
    })().then(() => {
      running = undefined;
      if (!stopped) schedule(options.intervalMs);
    });
    return running;
  };
  return {
    start() { if (!stopped) return; stopped = false; schedule(0); },
    async stop() { stopped = true; clearTimeout(timer); await running; },
  };
}
