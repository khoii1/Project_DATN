import type { LucideIcon } from "lucide-react";
import type { UserRole } from "./auth";

export interface NavigationItem {
  label: string;
  path: string;
  icon: LucideIcon;
  roles?: UserRole[];
}
