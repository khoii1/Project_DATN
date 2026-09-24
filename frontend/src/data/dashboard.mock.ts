import { BellRing, Cpu, Map, Tractor } from "lucide-react";

export const summaryStats = [
  { label: "Tổng trang trại", value: "3", note: "+1 trong tháng này", icon: Tractor, tone: "green" as const },
  { label: "Khu vực trồng", value: "8", note: "6 khu vực ổn định", icon: Map, tone: "blue" as const },
  { label: "Thiết bị hoạt động", value: "12", note: "92% đang trực tuyến", icon: Cpu, tone: "violet" as const },
  { label: "Cảnh báo", value: "2", note: "Cần kiểm tra hôm nay", icon: BellRing, tone: "amber" as const },
];

