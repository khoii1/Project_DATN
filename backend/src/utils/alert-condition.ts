import type { AlertOperator } from "@prisma/client";

export function violates(operator: AlertOperator, value: number, threshold: number) {
  if (operator === "LT") return value < threshold;
  if (operator === "LTE") return value <= threshold;
  if (operator === "GT") return value > threshold;
  return value >= threshold;
}

export function recovers(operator: AlertOperator, value: number, threshold: number, recoveryThreshold: number | null) {
  const recovery = recoveryThreshold ?? threshold;
  if (operator === "LT") return value >= recovery;
  if (operator === "LTE") return recoveryThreshold === null ? value > recovery : value >= recovery;
  if (operator === "GT") return value <= recovery;
  return recoveryThreshold === null ? value < recovery : value <= recovery;
}

export const operatorSymbol: Record<AlertOperator, string> = { LT: "<", LTE: "≤", GT: ">", GTE: "≥" };
