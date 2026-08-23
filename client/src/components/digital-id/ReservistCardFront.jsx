/**
 * Front face of the reservist Digital ID card.
 * The FRONT.png background provides the card artwork, so all overlay
 * content (avatar, name, rank, service number, bio, unit) is anchored to
 * the bottom of the card.
 */
export function ReservistCardFront({ profile, avatarUrl }) {
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const initials = [profile?.first_name?.[0], profile?.last_name?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase();
  const imageSrc = avatarUrl || null;

  return (
    <div
      className="relative flex h-full w-full flex-col rounded-3xl overflow-hidden"
      style={{
        clipPath: 'inset(0 round 1.5rem)',
        backgroundColor: '#fff',
        backgroundImage: 'url(/FRONT.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Content nudged slightly below the top of the card */}
      <div className="relative z-10 flex flex-col items-center px-[7%] pb-[7%] pt-[18%]">
        {/* Fixed square box guarantees the circle is never distorted by a
            wide/tall source image — image fills it with object-cover. */}
        <div className="relative aspect-square w-[34%] min-w-[88px] max-w-[150px] shrink-0">
          <div
            className="absolute inset-0 overflow-hidden rounded-full border-[3px] bg-neutral-100 shadow-md"
            style={{ borderColor: '#d9a300' }}
          >
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={fullName}
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: `${50 + (profile?.avatar_offset_x || 0)}% ${50 + (profile?.avatar_offset_y || 0)}%` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-neutral-500">
                {initials || '?'}
              </div>
            )}
          </div>
        </div>

        <h2 className="mt-3 text-center text-[clamp(1.1rem,4.5vw,1.5rem)] font-extrabold tracking-tight text-neutral-900">
          {fullName.toUpperCase() || 'RESERVIST'}
        </h2>
        <p className="text-center text-[clamp(0.75rem,2.8vw,0.9rem)]" style={{ color: '#32667F' }}>
          {profile?.rank || '—'}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[clamp(0.7rem,2.6vw,0.8rem)] text-neutral-700">
          <span className="font-mono">{profile?.service_number || ''}</span>
        </div>

        <div className="mt-3 w-full space-y-3 text-neutral-800">
          <div className="border-t border-neutral-200 pt-3">
            <h3 className="text-[clamp(0.85rem,3vw,0.95rem)] font-bold text-neutral-900">About me</h3>
            <p className="mt-1 line-clamp-3 text-[clamp(0.7rem,2.6vw,0.8rem)] leading-relaxed text-neutral-500">
              {profile?.bio || 'Tell people a bit about yourself — this shows up right here on your card.'}
            </p>
          </div>

          <div className="border-t border-neutral-200 pt-3">
            <h3 className="text-[clamp(0.85rem,3vw,0.95rem)] font-bold text-neutral-900">Unit</h3>
            <p className="mt-1 text-[clamp(0.7rem,2.6vw,0.8rem)] text-neutral-500">
              {[profile?.group_name, profile?.squadron_name].filter(Boolean).join(' / ') || 'Not assigned'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
