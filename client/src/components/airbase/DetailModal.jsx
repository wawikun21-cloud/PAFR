import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DetailModal
 * Full-featured modal: icon header, scrollable body, footer with actions.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   icon: React.ElementType,
 *   iconColor?: string,
 *   title: string,
 *   subtitle?: string,
 *   badge?: string,
 *   children: React.ReactNode,
 *   footer: React.ReactNode,
 *   size?: "md" | "lg" | "xl"
 * }} props
 */
export default function DetailModal({
  open, onClose,
  icon: Icon, iconColor = "bg-indigo-600",
  title, subtitle, badge,
  children, footer,
  size = "lg",
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const maxW = size === "xl" ? "max-w-3xl" : size === "lg" ? "max-w-2xl" : "max-w-lg";

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className={cn(
        "relative z-10 flex flex-col w-full max-h-[90vh]",
        maxW,
        "rounded-2xl border shadow-2xl shadow-black/20 dark:shadow-black/50",
        "bg-white dark:bg-neutral-900",
        "border-neutral-200 dark:border-neutral-800",
        "animate-in fade-in zoom-in-95 duration-150"
      )}>

        {/* ── Header ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 shrink-0 border-b border-neutral-100 dark:border-neutral-800 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm shrink-0",
              iconColor
            )}>
              <Icon size={18} strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <h2 className="truncate text-[15px] font-bold text-neutral-900 dark:text-neutral-50 leading-none">
                  {title}
                </h2>
                {badge && (
                  <span className="shrink-0 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 font-mono text-[10px] text-neutral-500">
                    {badge}
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-600">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto styled-scroll px-4 py-5 sm:px-6">
          {children}
        </div>

        {/* ── Footer ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between shrink-0 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 px-4 py-4 sm:px-6">
          {footer}
        </div>
      </div>
    </div>
  );
}

/* ── Shared detail field components ─────────────────────────── */

export function DetailSection({ title, children }) {
  return (
    <div className="mb-5">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-600">
        {title}
      </p>
      <div className="rounded-xl border border-neutral-100 dark:border-neutral-800 overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
        {children}
      </div>
    </div>
  );
}

export function DetailRow({ label, value, valueClass }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start justify-between gap-3 px-4 py-2.5 bg-white dark:bg-neutral-900">
      <span className="text-[12px] font-medium text-neutral-500 dark:text-neutral-500 shrink-0 w-24 sm:w-36">
        {label}
      </span>
      <span className={cn(
        "text-[13px] font-semibold text-neutral-800 dark:text-neutral-200 text-right break-words",
        valueClass
      )}>
        {value}
      </span>
    </div>
  );
}

export function DetailStatCard({ label, value, color }) {
  // Auto-scale: short values (≤6 chars) get large text, longer values get smaller
  const str = String(value ?? "");
  const fontSize =
    str.length <= 6  ? "text-2xl" :
    str.length <= 10 ? "text-lg"  :
    str.length <= 16 ? "text-sm"  : "text-xs";

  return (
    <div className={cn(
      "flex flex-col rounded-xl border px-3 py-3 min-h-[72px] justify-center",
      "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
    )}>
      <span className={cn(
        "font-black leading-tight tracking-tight break-words",
        fontSize,
        color ?? "text-neutral-900 dark:text-neutral-50"
      )}>
        {value}
      </span>
      <span className="mt-1 text-[10px] font-medium text-neutral-400 dark:text-neutral-600 leading-tight">
        {label}
      </span>
    </div>
  );
}