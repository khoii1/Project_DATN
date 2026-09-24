import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "./PageHeader";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
  phase: string;
}

export function PlaceholderPage({ title, description, icon: Icon, phase }: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} eyebrow="Smart Agriculture" />
      <section className="surface-card relative overflow-hidden px-6 py-14 sm:px-10">
        <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand-50" />
        <div className="relative max-w-xl">
          <div className="mb-6 grid h-14 w-14 place-items-center rounded-2xl bg-brand-100 text-brand-700"><Icon className="h-7 w-7" /></div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500">Dự kiến {phase}</span>
          <h2 className="mt-4 text-xl font-bold text-slate-900">Nền tảng đã sẵn sàng để phát triển</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">Giao diện khung và tuyến truy cập đã được chuẩn bị. Chức năng nghiệp vụ sẽ được xây dựng đúng giai đoạn, sau khi nền tảng được nghiệm thu.</p>
          <div className="mt-7 flex items-center gap-2 text-sm font-semibold text-brand-700">Đang ở Giai đoạn 1 <ArrowRight className="h-4 w-4" /></div>
        </div>
      </section>
    </div>
  );
}

