import { Loader2, QrCode, Phone, Home, Landmark } from 'lucide-react';
import { cn } from '@/lib/utils';

// Open corner-bracket frame (no solid border box), matching the reference design.
function CornerBracket({ corner }) {
  const base = 'absolute h-5 w-5 border-neutral-900';
  const variants = {
    'top-left': 'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-md',
    'top-right': 'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-md',
    'bottom-left': 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md',
    'bottom-right': 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md',
  };
  return <span className={`${base} ${variants[corner]}`} />;
}

// Renders a single "SCAN ME" label centered on one edge of the QR frame.
function ScanMeEdge({ side }) {
  const positionClasses = {
    top: '-top-[7px] left-1/2 -translate-x-1/2 -translate-y-1/2',
    bottom: '-bottom-[7px] left-1/2 -translate-x-1/2 translate-y-1/2',
    left: '-left-[7px] top-1/2 -translate-x-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180',
    right: '-right-[7px] top-1/2 translate-x-1/2 -translate-y-1/2 [writing-mode:vertical-rl]',
  };
  return (
    <span
      className={`absolute select-none whitespace-nowrap bg-white px-1 text-[8px] font-extrabold tracking-[0.15em] text-neutral-900 ${positionClasses[side]}`}
    >
      SCAN ME
    </span>
  );
}

function ContactRow({ icon: Icon, label, value, placeholder }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[clamp(0.75rem,2.8vw,0.85rem)] font-bold text-neutral-900">
        <Icon size={14} style={{ color: '#32667F' }} />
        {label} :
      </div>
      <p className="pl-0.5 text-[clamp(0.7rem,2.6vw,0.8rem)] text-neutral-600">{value || placeholder}</p>
    </div>
  );
}

/**
 * Back face of the reservist Digital ID card.
 * Shows the QR code (or a placeholder + generate button) plus emergency info.
 */
export function ReservistCardBack({ profile, qrDataUrl, onGenerate }) {
  const hasQr = Boolean(qrDataUrl);

  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl text-neutral-900 shadow-xl"
      style={{
        clipPath: 'inset(0 round 1.5rem)',
        backgroundColor: '#fff',
        backgroundImage: 'url(/BACK.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pt-8">
        <div className="relative flex items-center justify-center p-2">
          <CornerBracket corner="top-left" />
          <CornerBracket corner="top-right" />
          <CornerBracket corner="bottom-left" />
          <CornerBracket corner="bottom-right" />
          <ScanMeEdge side="top" />
          <ScanMeEdge side="bottom" />
          <ScanMeEdge side="left" />
          <ScanMeEdge side="right" />

          <div className="flex h-[150px] w-[150px] items-center justify-center rounded-lg bg-white">
            {hasQr ? (
              <img src={qrDataUrl} alt="Profile QR Code" className="h-[140px] w-[140px]" />
            ) : profile?.qr_code ? (
              <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-neutral-400">
                <QrCode size={36} strokeWidth={1.5} />
                <span className="px-4 text-center text-xs">No QR code yet</span>
              </div>
            )}
          </div>
        </div>

        {!hasQr && !profile?.qr_code && (
          <button
            onClick={onGenerate}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white',
              'transition-colors duration-200'
            )}
            style={{ backgroundColor: '#132F45' }}
          >
            <QrCode size={16} />
            Generate QR Code
          </button>
        )}
      </div>

      <div className="mt-auto space-y-3 px-6 pb-6 pt-4">
        <ContactRow
          icon={Landmark}
          label="Unit / Squadron"
          value={[profile?.group_name, profile?.squadron_name].filter(Boolean).join(' / ') || null}
          placeholder="Not assigned"
        />
        <ContactRow
          icon={Phone}
          label="Emergency Contact"
          value={profile?.emergency_contact_name}
          placeholder="—"
        />
        <ContactRow
          icon={Phone}
          label="Emergency Phone"
          value={profile?.emergency_contact_phone}
          placeholder="—"
        />
        <ContactRow
          icon={Home}
          label="Address"
          value={profile?.address}
          placeholder="—"
        />
      </div>
    </div>
  );
}
