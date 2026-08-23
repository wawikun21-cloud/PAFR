import { X, Upload, Trash2, Loader2, Move } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const AVATAR_MAX_BYTES = 10 * 1024 * 1024; // 10MB — keep in sync with the server
const AVATAR_ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const AVATAR_ALLOWED_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

/**
 * Facebook-style "Update profile picture" modal:
 *  - pick / change the photo
 *  - drag the image inside the circular frame to reposition (both axes)
 *  - Save to persist (photo upload + offset), Cancel to discard
 * Offsets are percentages in the -50..50 range applied via object-position.
 */
export default function AvatarAdjustModal({ open, onClose, profile, onSave, onRemove }) {
  const fileInputRef = useRef(null);
  const frameRef = useRef(null);
  const drag = useRef(null);

  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  const [offsetX, setOffsetX] = useState(Number(profile?.avatar_offset_x) || 0);
  const [offsetY, setOffsetY] = useState(Number(profile?.avatar_offset_y) || 0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Initialise draft state from the profile each time the modal opens.
  useEffect(() => {
    if (open) {
      setOffsetX(Number(profile?.avatar_offset_x) || 0);
      setOffsetY(Number(profile?.avatar_offset_y) || 0);
      setPendingFile(null);
      setPreviewUrl(null);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Revoke any object URL we created when the modal unmounts/closes.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  if (!open) return null;

  const displayUrl = previewUrl || profile?.avatar_url;
  const clamp = (v) => Math.max(-50, Math.min(50, v));

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const ext = (file.name || '').toLowerCase().slice(file.name.lastIndexOf('.'));
    const mime = (file.type || '').toLowerCase();
    if (!AVATAR_ALLOWED_MIME.includes(mime) || !AVATAR_ALLOWED_EXT.includes(ext)) {
      setError('Only image files (JPEG, PNG, GIF, WEBP) are allowed.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError(`File is too large. Maximum size is ${Math.round(AVATAR_MAX_BYTES / (1024 * 1024))}MB.`);
      return;
    }

    setError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const onPointerDown = (e) => {
    if (!displayUrl) return;
    drag.current = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    // Map pixel drag to the -50..50 offset range based on the frame width.
    const factor = 50 / (frameRef.current?.clientWidth || 224);
    setOffsetX(clamp(drag.current.ox - dx * factor));
    setOffsetY(clamp(drag.current.oy - dy * factor));
  };
  const onPointerUp = (e) => {
    drag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

  const handleSave = async () => {
    // Final guard: never upload a file that fails validation.
    if (pendingFile) {
      const ext = (pendingFile.name || '').toLowerCase().slice(pendingFile.name.lastIndexOf('.'));
      const mime = (pendingFile.type || '').toLowerCase();
      if (
        !AVATAR_ALLOWED_MIME.includes(mime) ||
        !AVATAR_ALLOWED_EXT.includes(ext) ||
        pendingFile.size > AVATAR_MAX_BYTES
      ) {
        setError('The selected file is invalid. Please choose a different image.');
        setSaving(false);
        return;
      }
    }
    setSaving(true);
    try {
      await onSave({ file: pendingFile, offsetX, offsetY });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm rounded-xl bg-white dark:bg-neutral-900 p-6 shadow-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
            Update profile picture
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X size={20} className="text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* Draggable circular frame */}
        <div className="flex justify-center mb-4">
          <div
            ref={frameRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={cn(
              "relative h-56 w-56 overflow-hidden rounded-full border-4 bg-neutral-100 dark:bg-neutral-800 select-none touch-none",
              displayUrl ? "cursor-grab active:cursor-grabbing" : "cursor-default"
            )}
            style={{ borderColor: '#d9a300' }}
          >
            {displayUrl ? (
              <img
                src={displayUrl}
                alt="Profile photo"
                draggable={false}
                className="absolute inset-0 h-full w-full object-cover pointer-events-none"
                style={{ objectPosition: `${50 + offsetX}% ${50 + offsetY}%` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-6xl font-bold text-neutral-400">
                {initials || '?'}
              </div>
            )}
            {displayUrl && (
              <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white">
                <Move size={12} />
                Drag to reposition
              </div>
            )}
          </div>
        </div>

        {/* Select / change photo */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white",
            "transition-colors duration-200"
          )}
          style={{ backgroundColor: '#132F45' }}
        >
          <Upload size={16} />
          {displayUrl ? 'Select a different photo' : 'Upload Photo'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={onFile}
        />

        {error && (
          <p className="mt-2 text-center text-xs font-medium text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {profile?.avatar_url && (
          <button
            type="button"
            onClick={() => {
              onRemove();
              onClose();
            }}
            className={cn(
              "mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-red-600",
              "hover:bg-red-50 dark:border-neutral-600 dark:text-red-400 dark:hover:bg-red-950/30",
              "transition-colors duration-200"
            )}
          >
            <Trash2 size={15} />
            Remove picture
          </button>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold",
              "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:text-neutral-200",
              "transition-colors duration-200"
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            )}
            style={{ backgroundColor: '#132F45' }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
