import { RotateCw } from 'lucide-react';
import { useFlipCard } from '@/DIGITAL_ID/useFlipCard';
import { ReservistCardFront } from './ReservistCardFront';
import { ReservistCardBack } from './ReservistCardBack';
import { cn } from '@/lib/utils';

/**
 * Flippable two-sided Digital ID card.
 * Front = identity, back = QR + emergency info. Clicking flips it.
 */
export function ReservistCard({ profile, avatarUrl, qrDataUrl, onGenerate }) {
  const { isFlipped, flip } = useFlipCard();

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Click to flip the profile card"
        onClick={flip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            flip();
          }
        }}
        className={cn(
          'card-flip-container w-full max-w-[clamp(260px,80vw,360px)] aspect-[3/5] cursor-pointer'
        )}
      >
        <div className={cn('card-flip-inner', isFlipped && 'is-flipped')}>
          <div className={cn('card-flip-face', isFlipped && 'pointer-events-none')}>
            <ReservistCardFront profile={profile} avatarUrl={avatarUrl} />
          </div>

          <div className={cn('card-flip-face card-flip-face--back', !isFlipped && 'pointer-events-none')}>
            <ReservistCardBack profile={profile} qrDataUrl={qrDataUrl} onGenerate={onGenerate} />
          </div>
        </div>
      </div>

      <p className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
        <RotateCw size={13} />
        Click the card to flip it and view your QR code on the back
      </p>
    </div>
  );
}
