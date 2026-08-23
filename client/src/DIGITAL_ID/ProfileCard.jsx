import { RotateCw } from "lucide-react"
import { useFlipCard } from "@/hooks/useFlipCard"
import { ProfileCardFront } from "@/components/profile/ProfileCardFront"
import { ProfileCardBack } from "@/components/profile/ProfileCardBack"
import { cn } from "@/lib/utils"

export function ProfileCard({ profile, avatarPreview, isEditing, onAvatarSelect, canvasWrapperRef, qrData, hasQrCode }) {
  const { isFlipped, flip } = useFlipCard()

  return (
    <div className="flex w-full flex-col items-center gap-3">
      <div
        role="button"
        tabIndex={0}
        aria-label="Click to flip the profile card"
        onClick={() => !isEditing && flip()}
        onKeyDown={(e) => {
          if (!isEditing && (e.key === "Enter" || e.key === " ")) flip()
        }}
        className={cn(
          // Fluid sizing: scales smoothly from phone -> tablet -> desktop
          // instead of jumping between fixed breakpoint pixel values.
          "card-flip-container w-full",
          "max-w-[clamp(260px,80vw,360px)] aspect-[3/5]",
          isEditing ? "cursor-default" : "cursor-pointer"
        )}
      >
        <div className={cn("card-flip-inner", isFlipped && "is-flipped")}>
          <div className={cn("card-flip-face shadow-xl", isFlipped && "pointer-events-none")}>
            <ProfileCardFront
              profile={profile}
              avatarPreview={avatarPreview}
              isEditing={isEditing}
              onAvatarSelect={onAvatarSelect}
            />
          </div>

          <div className={cn("card-flip-face card-flip-face--back shadow-xl", !isFlipped && "pointer-events-none")}>
            <ProfileCardBack
              profile={profile}
              qrData={qrData}
              hasQrCode={hasQrCode}
              canvasWrapperRef={canvasWrapperRef}
            />
          </div>
        </div>
      </div>

      {!isEditing && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RotateCw size={13} />
          Click the card to flip it and view your QR code on the back
        </p>
      )}
    </div>
  )
}