/** Independent of HTTP input; firmware retains its separate hard 5-second fail-safe. */
export function pumpRuntimeLimit(configured: number, testMode: boolean): number {
  return Math.min(configured, testMode ? 1 : 5);
}
