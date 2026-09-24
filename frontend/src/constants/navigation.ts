import {
  Activity,
  BellRing,
  ChartNoAxesCombined,
  Cpu,
  Droplets,
  History,
  LayoutDashboard,
  Map,
  Settings,
  Sprout,
  Tractor,
  Users,
} from "lucide-react";
import type { NavigationItem } from "../types/navigation";

export const navigationItems: NavigationItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Trang trại", path: "/farms", icon: Tractor },
  { label: "Khu vực trồng", path: "/zones", icon: Map },
  { label: "Cây trồng", path: "/crops", icon: Sprout },
  { label: "Thiết bị", path: "/devices", icon: Cpu },
  { label: "Dữ liệu cảm biến", path: "/sensors", icon: Activity },
  { label: "Cảnh báo", path: "/alerts", icon: BellRing },
  { label: "Điều khiển tưới", path: "/irrigation", icon: Droplets },
  { label: "Báo cáo", path: "/reports", icon: ChartNoAxesCombined },
  { label: "Nhật ký hoạt động", path: "/activity-logs", icon: History },
  { label: "Người dùng", path: "/users", icon: Users, roles: ["ADMIN"] },
  { label: "Cài đặt", path: "/settings", icon: Settings },
];

export const pageTitleByPath = Object.fromEntries(
  navigationItems.map(({ path, label }) => [path, label]),
) as Record<string, string>;
