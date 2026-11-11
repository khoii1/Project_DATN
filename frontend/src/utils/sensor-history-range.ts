export type HistoryPreset = "today" | "7d" | "30d" | "custom";
export interface HistoryRange { from: string; to: string }

export function presetRange(preset: Exclude<HistoryPreset, "custom">, now = new Date()): HistoryRange {
  const to = new Date(now);
  const from = new Date(to);
  if (preset === "today") from.setHours(0, 0, 0, 0);
  else from.setTime(to.getTime() - (preset === "7d" ? 7 : 30) * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function refreshedRange(preset: HistoryPreset, current: HistoryRange, now = new Date()): HistoryRange {
  return preset === "custom" ? current : presetRange(preset, now);
}
