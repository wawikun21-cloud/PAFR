import { GraduationCap, Upload, Quote as QuoteIcon } from "lucide-react"

function normalizeAvatarUrl(url) {
  if (!url) return ""
  try {
    const parsed = new URL(url)
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : ""
  } catch {
    return ""
  }
}

export function ProfileCardFront({ profile, avatarPreview, isEditing, onAvatarSelect }) {
  const fullName = profile?.full_name || "Your Name"
  const course = profile?.course_or_strand || "Your Course / Strand"
  const yearGraduated = profile?.year_graduated || "—"
  const aboutMe = profile?.about_me || "Tell people a bit about yourself — this shows up right here on your card."
  const quote = profile?.quote || ""
  const skills = Array.isArray(profile?.skills) ? profile.skills.slice(0, 3) : []
  const imageSrc = avatarPreview || normalizeAvatarUrl(profile?.avatar_url) || null

  return (
    <div className="relative flex h-full w-full flex-col rounded-3xl bg-white" style={{ clipPath: "inset(0 round 1.5rem)" }}>
      {/* decorative top wave background */}
      <img
        src="/assets/wave-top-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 w-full select-none"
      />

      {/* avatar */}
      <div className="relative z-10 flex flex-col items-center pt-[9%]">
        <div className="relative aspect-square w-[34%] min-w-[88px] max-w-[150px] shrink-0">
          {/*
            Clipping circle: a fixed square box with overflow-hidden,
            completely independent of the uploaded photo's own dimensions.
            The image is absolutely positioned to fill it with object-cover.
            This guarantees the circle can NEVER be stretched/distorted by
            a wide or tall source image — the box's shape is fixed by the
            wrapper, not by the image's intrinsic aspect ratio.
          */}
          <div className="absolute inset-0 overflow-hidden rounded-full border-[3px] border-[#1d4ed8] bg-neutral-100 shadow-md">
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={fullName}
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-neutral-500">
                {fullName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {isEditing && (
            <label
              htmlFor="avatar-upload"
              className="absolute bottom-0 right-0 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-neutral-900 text-white ring-2 ring-white transition-opacity hover:opacity-90"
            >
              <Upload size={14} />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onAvatarSelect?.(e.target.files?.[0])}
              />
            </label>
          )}
        </div>

        <h2 className="mt-3 text-center text-[clamp(1.1rem,4.5vw,1.5rem)] font-extrabold tracking-tight text-neutral-900">
          {fullName.toUpperCase()}
        </h2>
        <p className="text-center text-[clamp(0.75rem,2.8vw,0.9rem)] text-neutral-500">{course}</p>

        <div className="mt-2 flex items-center gap-1.5 text-[clamp(0.75rem,2.6vw,0.85rem)] text-neutral-700">
          <GraduationCap size={15} className="text-[#1d4ed8]" />
          <span className="font-semibold">Class of</span>
          <span>{yearGraduated}</span>
        </div>
      </div>

      {/* body */}
      <div className="relative z-10 flex flex-col gap-3 px-[7%] pb-[6%] pt-[5%] text-neutral-800">
        <div className="border-t border-neutral-200 pt-3">
          <h3 className="text-[clamp(0.85rem,3vw,0.95rem)] font-bold text-neutral-900">About me</h3>
          <p className="mt-1 line-clamp-3 text-[clamp(0.7rem,2.6vw,0.8rem)] leading-relaxed text-neutral-500">
            {aboutMe}
          </p>
        </div>

        {skills.length > 0 && (
          <div className="border-t border-neutral-200 pt-3">
            <h3 className="text-[clamp(0.85rem,3vw,0.95rem)] font-bold text-neutral-900">Skills</h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-[#1d4ed8]/40 px-2.5 py-1 text-[clamp(0.62rem,2.3vw,0.7rem)] font-medium text-[#1d4ed8]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {quote && (
          <div className="mt-1 flex items-start gap-2 border-t border-neutral-200 pt-3">
            <QuoteIcon size={16} className="mt-0.5 shrink-0 text-neutral-300" />
            <p className="text-[clamp(0.7rem,2.6vw,0.8rem)] italic leading-relaxed text-neutral-500">
              {quote}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}