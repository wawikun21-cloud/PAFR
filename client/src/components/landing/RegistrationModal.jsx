import { useState, useEffect } from "react";
import { Calendar, MapPin, X, ChevronDown, Paperclip, Users, Search, Shield, Loader } from "lucide-react";
import { shortDate, formatFileSize, formatDateShort, formatTime } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";
import {
  getTrainingSlotAvailability,
  createRegistration,
  getExternalTrainingAttachments,
  downloadExternalAttachment,
} from "@/services/trainingsService";
import { searchSquadrons, publicLookupReservist } from "@/services/organizationService";
import AttachmentIcon from "@/components/ui/AttachmentIcon";
import ViewAttachmentModal from "@/components/ui/ViewAttachmentModal";

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-50 dark:bg-indigo-500/10">
        <Icon size={13} className="text-indigo-500 dark:text-indigo-400" />
      </div>
      <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

// ─── SlotDisplay ─────────────────────────────────────────────────────────────

function SlotDisplay({ squadron, registration, isSelected, mode, isOwnSquadron }) {
  const remaining = registration.remaining;
  const registered = registration.registered;
  const limit = registration.slot_limit;
  const isUnlimited = limit === null || limit === 0;
  const isUnknown = registered === null;

  const isFull = mode === "full";
  const isClosed = mode === "closed";

  const bgClass = isSelected
    ? isFull
      ? "border-red-300 bg-red-100/50 dark:border-red-700/50 dark:bg-red-950/50"
      : isClosed
        ? "border-neutral-300 bg-neutral-100/50 dark:border-neutral-700/50 dark:bg-neutral-950/30"
        : "border-indigo-300 bg-indigo-50/50 dark:border-indigo-600/50 dark:bg-indigo-950/30"
    : isOwnSquadron
      ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800/50 dark:bg-emerald-950/20"
      : isFull
        ? "border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30"
        : isClosed
          ? "border-neutral-300 bg-neutral-100/50 dark:border-neutral-700/50 dark:bg-neutral-950/30"
          : "border-neutral-200 dark:border-neutral-700";

  const pillClass = isUnlimited
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300"
    : isFull
      ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
      : isClosed
        ? "bg-neutral-100 text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300"
        : isUnknown
          ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
          : typeof remaining === "number" && remaining > 5
            ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
            : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";

  const remainingNum = typeof remaining === "number" ? remaining : 0;
  const registeredDisplay = isUnknown ? "—" : registered;
  const limitDisplay = isUnlimited ? "∞" : (limit ?? "—");

  return (
    <div className={`p-3 rounded-lg border ${bgClass} transition-all`}>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
          Squadron: {squadron.name}{isOwnSquadron && <span className="ml-1.5 text-emerald-600 dark:text-emerald-400">(Your Squadron)</span>}
        </p>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${pillClass}`}>
          {isUnlimited
            ? "Unlimited slots"
            : isClosed
              ? "Registration closed"
              : isFull
                ? "Full"
                : isUnknown
                  ? "Loading…"
                  : `${remainingNum} slot${remainingNum !== 1 ? "s" : ""} left`}
        </span>
      </div>
      <span className="text-xs text-neutral-500 dark:text-neutral-400">
        {registeredDisplay} / {limitDisplay} registered
      </span>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function RegistrationModal({ training, isOpen, onClose, currentUser }) {
  const [selectedSquadronId, setSelectedSquadronId] = useState(null);
  const [squadrons, setSquadrons] = useState([]);
  const [squadronError, setSquadronError] = useState("");
  const [squadronLoading, setSquadronLoading] = useState(false);
  const [slotAvailability, setSlotAvailability] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotInfoError, setSlotInfoError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [attachmentError, setAttachmentError] = useState("");
  const [viewModal, setViewModal] = useState({ isOpen: false, file: null, fileName: '', fileType: '' });

  // Lookup state
  const [lookupValue, setLookupValue] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookedUpReservist, setLookedUpReservist] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSquadrons();
      loadSlotAvailability();
      loadAttachments();
      setDropdownOpen(false);
    }
  }, [isOpen, training?.id]);

  const loadSquadrons = async () => {
    if (!training?.id) { setSquadrons([]); return; }
    setSquadronLoading(true);
    setSquadronError("");
    try {
      const result = await searchSquadrons("", 100);
      if (result.success) {
        setSquadrons(result.squadrons ?? []);
      } else {
        setSquadronError(result.message || "Failed to load squadrons");
        setSquadrons([]);
      }
    } catch (err) {
      setSquadronError(err.message || "Failed to load squadrons");
      setSquadrons([]);
    } finally {
      setSquadronLoading(false);
    }
  };

  const loadSlotAvailability = async () => {
    if (!training?.id) return;
    setLoadingSlots(true);
    setSlotInfoError("");
    try {
      const result = await getTrainingSlotAvailability(training.id);
      if (result.success) {
        setSlotAvailability(result.data);
      } else {
        setSlotInfoError(result.message || "Failed to load slot availability");
      }
    } catch (err) {
      setSlotInfoError(err.message || "Failed to load slot availability");
    } finally {
      setLoadingSlots(false);
    }
  };

  const loadAttachments = async () => {
    if (!training?.id) return;
    setLoadingAttachments(true);
    setAttachmentError("");
    try {
      const result = await getExternalTrainingAttachments(training.id);
      if (result.success) {
        setAttachments(result.data || []);
      } else {
        setAttachmentError(result.message);
      }
    } catch (err) {
      setAttachmentError(err.message || "Failed to load attachments");
    } finally {
      setLoadingAttachments(false);
    }
  };

  const handleLookup = async () => {
    setLookupError("");
    setLookedUpReservist(null);
    const trimmed = lookupValue.trim();
    if (!trimmed) {
      setLookupError("Enter your Service Number or Name");
      return;
    }
    setLookupLoading(true);
    try {
      const isSerialLike = /^[A-Z]{1,3}[-]\d+$/i.test(trimmed);
      // Use public lookup for external training registration (no auth required)
      const result = await publicLookupReservist(isSerialLike ? trimmed : null, isSerialLike ? null : trimmed);
      if (result.success && result.data) {
        setLookedUpReservist(result.data);
        if (result.data.squadron_id) {
          setSelectedSquadronId(result.data.squadron_id);
        }
      } else {
        setLookupError(result.message || "Reservist not found");
      }
    } catch (err) {
      setLookupError(err.message || "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleClearLookup = () => {
    setLookupValue("");
    setLookedUpReservist(null);
    setSelectedSquadronId(null);
    setLookupError("");
  };

  if (!isOpen) return null;

  const squadronLimits = training.squadron_limits || [];

  const allowedSquadronIds = squadronLimits.reduce((set, s) => {
    set.add(Number(s.squadron_id || s.id));
    return set;
  }, new Set());

  const availableSquadrons = (squadrons ?? []).filter((sq) => {
    const sqId = sq.id ?? sq.squadron_id;
    return allowedSquadronIds.size === 0 ? true : allowedSquadronIds.has(Number(sqId));
  });

  const selectedSlotData =
    slotAvailability?.hasSquadronLimits && slotAvailability.squads
      ? slotAvailability.squads.find((s) => Number(s.squadron_id) === Number(selectedSquadronId))
      : null;

  const interpretSlotState = (slotData) => {
    if (!slotData) return { registered: null, slotLimit: null, remaining: null, isUnlimited: false, isFull: false };
    const registered = Number(slotData.registered ?? 0);
    const slotLimitRaw = slotData.slot_limit ?? slotData.slotLimit ?? null;
    const slotLimit = slotLimitRaw === null ? null : Number(slotLimitRaw);
    const isUnlimited = typeof slotData.isUnlimited === "boolean" ? slotData.isUnlimited : slotLimit === null || slotLimit === 0;
    const remainingRaw = slotData.remaining;
    const remaining = remainingRaw == null ? null : Number(remainingRaw);
    const isFull = typeof slotData.isFull === "boolean" ? slotData.isFull : !isUnlimited && typeof remaining === "number" && remaining <= 0;
    return { registered, slotLimit, remaining, isUnlimited, isFull };
  };

  const isRegistrationClosed = training?.status != null ? String(training.status).toLowerCase() !== "open" : false;

  const getSquadronMode = (slotData) => {
    if (isRegistrationClosed) return "closed";
    const state = interpretSlotState(slotData);
    if (state.isUnlimited) return "open";
    if (state.isFull) return "full";
    return "open";
  };

  const selectedSquadronMode = getSquadronMode(selectedSlotData);
  const isSelectedSquadronFull = selectedSquadronMode === "full";
  const isSubmitBlocked = isRegistrationClosed || isSelectedSquadronFull;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    if (!lookedUpReservist) {
      setSubmitError("Please look up your reservist profile first");
      return;
    }
    if (!selectedSquadronId) {
      setSubmitError("Please select your squadron");
      return;
    }
    if (isRegistrationClosed) {
      setSubmitError("Registration is closed for this event");
      return;
    }
    if (squadronLimits && squadronLimits.length > 0) {
      const mode = getSquadronMode(selectedSlotData);
      if (mode === "full") {
        setSubmitError("Selected squadron is full");
        return;
      }
    }

    setSubmitting(true);
    try {
      const participantData = {
        reservist_id: lookedUpReservist.id,
        first_name: lookedUpReservist.first_name,
        last_name: lookedUpReservist.last_name,
        rank: lookedUpReservist.rank,
        service_number: lookedUpReservist.service_number,
        squadron_id: Number(selectedSquadronId),
        squadron_name: lookedUpReservist.squadron_name || (availableSquadrons.find(s => Number(s.id) === Number(selectedSquadronId))?.name) || '',
        email: lookedUpReservist.email,
      };

      const result = await createRegistration(training.id, participantData);
      if (result.success) {
        setSubmitSuccess(true);
        await loadSlotAvailability();
        setTimeout(() => { onClose(); setSubmitSuccess(false); }, 2000);
      } else {
        throw new Error(result.message || "Registration failed");
      }
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasAttachments = attachments.length > 0 || loadingAttachments || attachmentError;
  const hasSlots = squadronLimits && squadronLimits.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-2xl flex flex-col rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-800 max-h-[90vh]">

        <div className="flex items-start justify-between px-6 pt-6 pb-5 border-b border-neutral-100 dark:border-neutral-800 flex-shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 leading-snug">
              {training.title || "Untitled Event"}
            </h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <Calendar size={12} className="text-indigo-400" />
                {shortDate(training.start_datetime || training.start_date)}{formatTime(training.start_time || training.start_datetime) && ` · ${formatTime(training.start_time || training.start_datetime)}`}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <MapPin size={12} className="text-indigo-400" />
                {training.location || training.venue || "Location not set"}
              </span>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0 flex items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:text-violet-300 uppercase tracking-wide whitespace-nowrap">
              External Event
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-6">

            <div>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {training.description || "No description available."}
              </p>
            </div>

{(hasSlots || loadingSlots || slotInfoError) && (
               <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-800/30 p-4">
                 <SectionHeader icon={Users} label="Squadron Slot Availability" />
                 {lookedUpReservist && lookedUpReservist.squadron_name && (
                   <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">Your squadron: {lookedUpReservist.squadron_name}</p>
                 )}
                 {loadingSlots ? (
                   <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading slot availability…</p>
                 ) : slotInfoError ? (
                   <p className="text-xs text-red-500">{slotInfoError}</p>
                 ) : hasSlots ? (
                   <div className="space-y-2">
                     {squadronLimits.map((squadron) => {
                       const squadId = squadron.squadron_id || squadron.id;
                       const slotData =
                         slotAvailability?.hasSquadronLimits && slotAvailability.squads
                           ? slotAvailability.squads.find((s) => Number(s.squadron_id) === Number(squadId))
                           : null;
                       const serverState = interpretSlotState(slotData);
                       const isSelected = Number(selectedSquadronId) === Number(squadId);
                       const isOwnSquadron = lookedUpReservist && Number(lookedUpReservist.squadron_id) === Number(squadId);
                       const mode = getSquadronMode(slotData);
                       return (
                         <SlotDisplay
                           key={squadId}
                           squadron={{ id: squadId, name: squadron.name }}
                           registration={{ registered: serverState.registered, slot_limit: serverState.slotLimit, remaining: serverState.remaining }}
                           isSelected={isSelected}
                           mode={mode}
                           isOwnSquadron={isOwnSquadron}
                         />
                       );
                     })}
                   </div>
                 ) : (
                   <p className="text-sm text-neutral-500 dark:text-neutral-400">No squadron slot limits configured.</p>
                 )}
               </div>
             )}

            {hasAttachments && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-800/30 p-4">
                <SectionHeader icon={Paperclip} label="Event Attachments" />
                {loadingAttachments ? (
                  <p className="text-sm text-neutral-400 dark:text-neutral-500">Loading attachments…</p>
                ) : attachmentError ? (
                  <p className="text-xs text-red-500">{attachmentError}</p>
                ) : attachments.length === 0 ? (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">No attachments available.</p>
                ) : (
                  <div className="space-y-2">
                    {attachments.map((attachment) => {
                      const fileExt = (attachment.original_filename || attachment.name || '').split('.').pop() || '';
                      return (
                        <div
                          key={attachment.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                        >
                          <div className="flex-shrink-0">
                            <AttachmentIcon fileType={fileExt} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate" title={attachment.original_filename || attachment.name}>
                              {attachment.original_filename || attachment.name}
                            </p>
                            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                              {formatFileSize(attachment.size_bytes)}
                              {attachment.created_at && ` · ${formatDateShort(attachment.created_at)}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {!submitSuccess && (
              <div className="rounded-xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-800/30 p-4">
                <SectionHeader icon={Shield} label="Reservist Verification" />

                <div className="space-y-3">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Enter your Service Number (e.g. O-123456) or your full name to verify your identity.
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={lookupValue}
                      onChange={(e) => setLookupValue(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLookup(); } }}
                      placeholder="Service Number or Name"
                      disabled={lookupLoading || submitting}
                      className="flex-1 px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
                    />
                    <Button
                      type="button"
                      onClick={handleLookup}
                      disabled={lookupLoading || submitting || !lookupValue.trim()}
                      className="flex items-center gap-2"
                    >
                      {lookupLoading ? <Loader size={14} className="animate-spin" /> : <Search size={14} />}
                      {lookupLoading ? 'Looking up…' : 'Look up'}
                    </Button>
                  </div>

                  {lookupError && (
                    <p className="text-xs text-red-500">{lookupError}</p>
                  )}

                  {lookedUpReservist && (
                    <div className="rounded-lg border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold text-sm">
                            {(lookedUpReservist.first_name?.[0] || '')}{(lookedUpReservist.last_name?.[0] || '')}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                              {lookedUpReservist.rank} {lookedUpReservist.first_name} {lookedUpReservist.last_name}
                            </p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {lookedUpReservist.service_number}
                              </span>
                              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                {lookedUpReservist.squadron_name || 'Unassigned squadron'}
                              </span>
                              {lookedUpReservist.email && (
                                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {lookedUpReservist.email}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleClearLookup}
                          className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}

                  {lookedUpReservist && (
                    <div className="pt-2">
                      <label className="block text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
                        Select Your Squadron
                      </label>
                      <div className="relative">
                        <button
                          type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDropdownOpen(prev => !prev);
                      }}
                          disabled={submitting || squadronLoading}
                          className="w-full flex items-center justify-between px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-left text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:opacity-50"
                        >
                          <span className={selectedSquadronId ? "" : "text-neutral-400"}>
                            {selectedSquadronId
                              ? (() => {
                                  const sq = squadrons.find(s => Number(s.id) === Number(selectedSquadronId));
                                  const reserveSqName = lookedUpReservist?.squadron_name || lookedUpReservist?.squadron || '';
                                  if (sq) return `${sq.name}${sq.code ? ` (${sq.code})` : ""}`;
                                  if (reserveSqName && Number(selectedSquadronId) === Number(lookedUpReservist?.squadron_id)) return reserveSqName;
                                  return String(selectedSquadronId);
                                })()
                              : "Choose a squadron..."}
                          </span>
                          <ChevronDown size={16} className="text-neutral-400" />
                        </button>
                        <div id="sq-dropdown" className="hidden absolute top-full left-0 mt-1 w-full max-h-60 overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-50">
                          {squadrons.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-neutral-400">No squadrons available for this event</div>
                          ) : (
                            squadrons.map((squadron) => (
                              <button
                                key={squadron.id}
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setSelectedSquadronId(squadron.id);
                                  const dropdown = document.getElementById('sq-dropdown');
                                  if (dropdown) dropdown.classList.add('hidden');
                                }}
                                className={`w-full text-left px-3 py-2 text-sm first:rounded-t-lg last:rounded-b-lg ${Number(squadron.id) === Number(selectedSquadronId) ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300' : 'text-neutral-700 dark:text-neutral-200 hover:bg-indigo-50 dark:hover:bg-neutral-800'}`}
                              >
                                {squadron.name}{squadron.code ? ` (${squadron.code})` : ""}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {submitError && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-3 py-2.5">
                      <p className="text-sm text-red-600 dark:text-red-400">{submitError}</p>
                    </div>
                  )}
                  {!submitError && lookedUpReservist && selectedSquadronId && isRegistrationClosed && (
                    <div className="flex items-start gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 px-3 py-2.5">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Registration is currently closed for this event.</p>
                    </div>
                  )}
                  {!submitError && lookedUpReservist && selectedSquadronId && !isRegistrationClosed && isSelectedSquadronFull && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 px-3 py-2.5">
                      <p className="text-sm text-red-600 dark:text-red-400">This squadron has reached its slot limit. No more registrations can be accepted.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {submitSuccess && (
              <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  Registration Successful!
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  You have been registered for this event. This window will close shortly.
                </p>
              </div>
            )}
          </div>
        </div>

        {!submitSuccess && (
          <div className="flex-shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-b-2xl">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={(e) => handleSubmit(e)}
              disabled={submitting || !lookedUpReservist || !selectedSquadronId || isSubmitBlocked}
            >
              {submitting ? "Registering…" : "Complete Registration"}
            </Button>
          </div>
        )}
      </div>

      <ViewAttachmentModal
        isOpen={viewModal.isOpen}
        onClose={() => setViewModal({ isOpen: false, file: null, fileName: '', fileType: '' })}
        file={viewModal.file}
        fileName={viewModal.fileName}
        fileType={viewModal.fileType}
      />
    </div>
  );
}
