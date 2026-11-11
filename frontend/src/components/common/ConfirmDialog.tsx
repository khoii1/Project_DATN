import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent } from "react";

interface ConfirmDialogProps { title: string; description: string; confirmLabel: string; tone?: "warning" | "danger"; loading?: boolean; error?: string; onCancel: () => void; onConfirm: () => Promise<void>; }
export function ConfirmDialog({ title, description, confirmLabel, tone = "warning", loading = false, error, onCancel, onConfirm }: ConfirmDialogProps) {
  const titleId = useId(), descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialogRef.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, []);
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && !loading) { event.preventDefault(); onCancel(); }
    if (event.key !== "Tab") return;
    const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
    if (!buttons.length) { event.preventDefault(); dialogRef.current?.focus(); return; }
    const first = buttons[0], last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  return <div className="fixed inset-0 z-[90] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm" ref={dialogRef} tabIndex={-1} onKeyDown={handleKeyDown} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}><div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"><div className={`grid h-12 w-12 place-items-center rounded-xl ${tone === "danger" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}><AlertTriangle className="h-6 w-6" /></div><h2 id={titleId} className="mt-5 text-xl font-bold text-slate-900">{title}</h2><p id={descriptionId} className="mt-3 text-sm leading-6 text-slate-500">{description}</p>{error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="mt-6 flex justify-end gap-3"><button disabled={loading} onClick={onCancel} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Hủy</button><button disabled={loading} onClick={() => void onConfirm()} className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60 ${tone === "danger" ? "bg-red-600" : "bg-amber-600"}`}>{loading && <Loader2 className="h-4 w-4 animate-spin" />}{confirmLabel}</button></div></div></div>;
}

