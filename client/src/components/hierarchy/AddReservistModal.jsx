import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import {
  X, UserPlus, ChevronDown, CheckCircle2,
  Phone, Shield, Layers, MapPin, Tag, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { rankOptions, statusOptions } from "@/data/reservistsData";
import { getArcens, getGroupsList } from "@/services/api";

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────

function FieldLabel({ children, required }) {
  return (
    <label className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
      {children}
      {required && <span className="text-red-400 text-[10px]">*</span>}
    </label>
  );
}

function FieldInput({ icon: Icon, error, className, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
        />
      )}
      <input
        {...props}
        className={cn(
          "w-full rounded-lg border py-2.5 text-sm",
          Icon ? "pl-9 pr-3" : "px-3",
          "border-neutral-200 dark:border-neutral-700",
          "bg-white dark:bg-neutral-800",
          "text-neutral-800 dark:text-neutral-200",
          "placeholder:text-neutral-400 dark:placeholder:text-neutral-600",
          "outline-none focus:ring-2 focus:border-indigo-400",
          error
            ? "border-red-300 dark:border-red-500/50 focus:ring-red-400/30"
            : "focus:ring-indigo-500/30",
          "transition-all duration-150",
          className
        )}
      />
      {error && (
        <p className="mt-1 text-[10px] font-medium text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function FieldSelect({ icon: Icon, error, children, className, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          size={13}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600 z-10"
        />
      )}
      <select
        {...props}
        className={cn(
          "w-full appearance-none rounded-lg border py-2.5 pr-8 text-sm cursor-pointer",
          Icon ? "pl-9" : "pl-3",
          "border-neutral-200 dark:border-neutral-700",
          "bg-white dark:bg-neutral-800",
          "text-neutral-800 dark:text-neutral-200",
          "outline-none focus:ring-2 focus:border-indigo-400",
          error
            ? "border-red-300 dark:border-red-500/50 focus:ring-red-400/30"
            : "focus:ring-indigo-500/30",
          "transition-all duration-150",
          className
        )}
      >
        {children}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-600"
      />
      {error && (
        <p className="mt-1 text-[10px] font-medium text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

/** Read-only auto-filled field */
function AutoFilledField({ icon: Icon, label, value }) {
  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2.5",
        "border-neutral-200 dark:border-neutral-700",
        "bg-neutral-50 dark:bg-neutral-900"
      )}>
        {Icon && <Icon size={13} className="shrink-0 text-indigo-400 dark:text-indigo-500" />}
        <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
          {value || <span className="italic text-neutral-400 dark:text-neutral-600">Not selected</span>}
        </span>
        <span className="ml-auto shrink-0 rounded bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
          auto
        </span>
      </div>
    </div>
  );
}

/** Status toggle pills */
function StatusToggle({ value, onChange }) {
  const options = [
    { value: "active",   label: "Active",   color: "emerald" },
    { value: "training", label: "Training", color: "indigo"  },
    { value: "inactive", label: "Inactive", color: "neutral" },
  ];

  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const colorMap = {
          emerald: isSelected
            ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/40"
            : "border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-emerald-300 dark:hover:border-emerald-600",
          indigo: isSelected
            ? "border-indigo-400 bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400 dark:border-indigo-500/40"
            : "border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-indigo-300 dark:hover:border-indigo-600",
          neutral: isSelected
            ? "border-neutral-400 bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300 dark:border-neutral-500"
            : "border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-300",
        };

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-2 text-xs font-semibold",
              "transition-all duration-150 outline-none",
              "focus-visible:ring-2 focus-visible:ring-indigo-500/40",
              colorMap[opt.color]
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Success state shown after submit */
function SuccessState({ name, onClose }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-500/20">
        <CheckCircle2 size={32} className="text-emerald-500 dark:text-emerald-400" strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Reservist Added</p>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-semibold text-neutral-700 dark:text-neutral-300">{name}</span> has been
          successfully enrolled.
        </p>
      </div>
      <p className="text-xs text-neutral-400 dark:text-neutral-600">
        (Mock only — no data was persisted to a backend.)
      </p>
      <button
        onClick={onClose}
        className={cn(
          "mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5",
          "text-sm font-semibold text-white shadow-sm",
          "transition-colors duration-150"
        )}
      >
        Done
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────

const PHONE_RE = /^(09|\+639)\d{9}$/;

function validate(fields) {
  const errors = {};
  if (!fields.fullName.trim())     errors.fullName = "Full name is required.";
  if (!fields.rank)                errors.rank     = "Please select a rank.";
  if (!fields.contact.trim())      errors.contact  = "Contact number is required.";
  else if (!PHONE_RE.test(fields.contact.replace(/\s/g, "")))
    errors.contact = "Enter a valid PH mobile number (e.g. 09171234567).";
  return errors;
}

// ─────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  fullName: "",
  rank:     "",
  contact:  "",
  status:   "active",
  arcen:    "",
  group:    "",
};

/**
 * AddReservistModal
 *
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   context?: {
 *     arcen?: string,
 *     group?: string,
 *     squadron?: string,
 *   },
 *   onSubmit?: (reservist: object) => void,
 * }} props
 */
export default function AddReservistModal({ isOpen, onClose, context = {}, onSubmit }) {
  const [fields, setFields]   = useState(EMPTY_FORM);
  const [errors, setErrors]   = useState({});
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [arcenOptions, setArcenOptions] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef(null);

  // Filter groups based on selected ARSEN
  const filteredGroupOptions = useMemo(() => {
    if (!groupOptions.length || !fields.arcen) return [];
    const selectedArsen = parseInt(fields.arcen, 10);
    return groupOptions.filter(g => {
      const arsenId = g.arsen_id != null ? parseInt(g.arsen_id, 10) : null;
      return arsenId === selectedArsen;
    });
  }, [fields.arcen, groupOptions]);

  // Load ARCEN and Group options on open
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([getArcens(), getGroupsList()])
        .then(([arRes, grRes]) => {
          if (arRes.data.status === 'success') {
            setArcenOptions(arRes.data.data.map(a => ({ value: a.id, label: a.name })));
          }
          if (grRes.data.status === 'success') {
            setGroupOptions(grRes.data.data.map(g => ({
              value: g.id,
              label: g.name,
              arsen_id: g.arsen_id
            })));
          }
        })
        .catch(err => console.error('Failed to load options:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFields(EMPTY_FORM);
      setErrors({});
      setSuccess(false);
      // Focus first field after animation settles
      setTimeout(() => firstInputRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Trap Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  const setField = useCallback((key, val) => {
    setFields((prev) => ({ ...prev, [key]: val }));
    setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  const handleArcenChange = (e) => {
    const val = e.target.value;
    setFields((prev) => ({ ...prev, arcen: val, group: '' }));
  };

  const handleGroupChange = (e) => {
    const val = e.target.value;
    setFields((prev) => ({ ...prev, group: val }));
  };

  const handleSubmit = () => {
    const errs = validate(fields);
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setIsSubmitting(true);
    // Simulate async — replace with real API call later
    setTimeout(() => {
      const newReservist = {
        id:             `r-${Date.now()}`,
        name:           fields.fullName.trim(),
        rank:           fields.rank,
        contact:        fields.contact.trim(),
        status:         fields.status,
        specialization: fields.group ?? context.squadron ?? "Unassigned",
        joined:         new Date().toISOString().split("T")[0],
        _meta: {
          arcen:    fields.arcen ?? context.arcen    ?? null,
          group:    fields.group ?? context.group    ?? null,
          squadron: context.squadron ?? null,
        },
      };

      console.log("[AddReservistModal] New reservist (mock):", newReservist);
      onSubmit?.(newReservist);

      setIsSubmitting(false);
      setSuccess(true);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────── */}
      <div
        className={cn(
          "fixed inset-0 z-50",
          "bg-black/40 dark:bg-black/60 backdrop-blur-sm",
          "animate-in fade-in duration-150"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Dialog ────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "fixed inset-0 z-50 flex items-center justify-center p-4",
          "pointer-events-none"
        )}
      >
        <div className={cn(
          "pointer-events-auto w-full max-w-lg",
          "rounded-2xl border shadow-2xl shadow-black/20 dark:shadow-black/50",
          "border-neutral-200 dark:border-neutral-700",
          "bg-white dark:bg-neutral-900",
          "animate-in slide-in-from-bottom-3 fade-in duration-200",
          "flex flex-col max-h-[90vh]"
        )}>

          {/* ── Header ──────────────────────────────────────────── */}
          <div className={cn(
            "flex shrink-0 items-center gap-3 border-b px-4 py-4 sm:px-5",
            "border-neutral-200 dark:border-neutral-800"
          )}>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-200 dark:shadow-indigo-900/40">
              <UserPlus size={16} strokeWidth={2} />
            </span>
            <div>
              <h2
                id="modal-title"
                className="text-[15px] font-bold tracking-tight text-neutral-900 dark:text-neutral-50 leading-none"
              >
                Add New Reservist
              </h2>
              <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-600">
                Enroll a new member into the unit
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className={cn(
                "ml-auto flex h-8 w-8 items-center justify-center rounded-lg",
                "text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200",
                "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                "transition-colors duration-150"
              )}
            >
              <X size={15} />
            </button>
          </div>

          {/* ── Body ──────────────────────────────────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
            {success ? (
              <SuccessState name={fields.fullName} onClose={onClose} />
            ) : (
              <div className="flex flex-col gap-5">

                {/* ── Auto-filled unit context ───────────────────── */}
                {(context.arcen || context.group || context.squadron) && (
                  <div className={cn(
                    "rounded-xl border border-dashed px-4 py-3",
                    "border-indigo-200 dark:border-indigo-500/30",
                    "bg-indigo-50/50 dark:bg-indigo-500/5"
                  )}>
                    <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-indigo-400 dark:text-indigo-600">
                      Assignment (auto-filled from selection)
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      <AutoFilledField icon={Shield} label="ARCEN"    value={context.arcen}    />
                      <AutoFilledField icon={Layers} label="Group"    value={context.group}    />
                      <AutoFilledField icon={MapPin} label="Squadron" value={context.squadron} />
                    </div>
                  </div>
                )}

                {/* ── Full Name ─────────────────────────────────── */}
                <div className="flex flex-col gap-1.5">
                  <FieldLabel required>Full Name</FieldLabel>
                  <FieldInput
                    ref={firstInputRef}
                    icon={User}
                    type="text"
                    placeholder="e.g. Sgt. Juan dela Cruz"
                    value={fields.fullName}
                    onChange={(e) => setField("fullName", e.target.value)}
                    error={errors.fullName}
                  />
                </div>

                {/* ── Rank + Status ─────────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <FieldLabel required>Rank</FieldLabel>
                    <FieldSelect
                      icon={Shield}
                      value={fields.rank}
                      onChange={(e) => setField("rank", e.target.value)}
                      error={errors.rank}
                    >
                      <option value="" disabled>Select rank…</option>
                      {rankOptions.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </FieldSelect>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <FieldLabel>Specialization</FieldLabel>
                    <FieldInput
                      icon={Tag}
                      type="text"
                      placeholder="e.g. Security, Medical…"
                      value={fields.specialization ?? ""}
                      onChange={(e) => setField("specialization", e.target.value)}
                    />
                  </div>
                </div>

                {/* ── Contact ──────────────────────────────────── */}
                <div className="flex flex-col gap-1.5">
                  <FieldLabel required>Contact Number</FieldLabel>
                  <FieldInput
                    icon={Phone}
                    type="tel"
                    placeholder="09XXXXXXXXX"
                    value={fields.contact}
                    onChange={(e) => setField("contact", e.target.value)}
                    error={errors.contact}
                  />
                </div>

                {/* ── Status ───────────────────────────────────── */}
                <div className="flex flex-col gap-1.5">
                  <FieldLabel>Status</FieldLabel>
                  <StatusToggle
                    value={fields.status}
                    onChange={(val) => setField("status", val)}
                  />
                </div>

              </div>
            )}
          </div>

          {/* ── Footer ─────────────────────────────────────────── */}
          {!success && (
            <div className={cn(
              "flex shrink-0 flex-col-reverse gap-3 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
              "border-neutral-200 dark:border-neutral-800",
              "bg-neutral-50 dark:bg-neutral-900 rounded-b-2xl"
            )}>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-600">
                Fields marked <span className="text-red-400">*</span> are required.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className={cn(
                    "flex-1 rounded-lg border px-4 py-2 text-sm font-medium sm:flex-none",
                    "border-neutral-200 dark:border-neutral-700",
                    "text-neutral-600 dark:text-neutral-400",
                    "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    "transition-colors duration-150"
                  )}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold sm:flex-none",
                    "bg-indigo-600 hover:bg-indigo-700 text-white",
                    "shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "transition-all duration-150"
                  )}
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      Add Reservist
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}