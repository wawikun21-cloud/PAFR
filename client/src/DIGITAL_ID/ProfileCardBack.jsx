import { QRCodeCanvas } from "qrcode.react"
import { Landmark, Home, Phone, Mail, Globe, QrCode, ExternalLink } from "lucide-react"

function FacebookIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5.02 3.66 9.18 8.44 9.94v-7.03H7.9v-2.91h2.54V9.85c0-2.52 1.49-3.91 3.77-3.91 1.09 0 2.23.2 2.23.2v2.47h-1.26c-1.24 0-1.63.78-1.63 1.57v1.88h2.78l-.44 2.91h-2.34V22C18.34 21.24 22 17.08 22 12.06Z" />
    </svg>
  )
}

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M18.9 2H22l-6.78 7.75L23.2 22h-6.25l-4.89-6.39L6.48 22H3.36l7.25-8.29L3 2h6.41l4.41 5.83L18.9 2Zm-1.1 17.85h1.73L8.33 4.1H6.48l11.32 15.75Z" />
    </svg>
  )
}

function InstagramIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37a4 4 0 1 1-3.37-5.34A4 4 0 0 1 16 11.37Z" />
      <path d="M17.5 6.5h.01" />
    </svg>
  )
}

function LinkedInIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M6.94 8.98H3.6V21h3.34V8.98ZM5.27 4A1.93 1.93 0 1 1 5.26 7.9 1.93 1.93 0 0 1 5.27 4ZM20.4 14.1c0-3.17-1.69-5.13-4.42-5.13a3.82 3.82 0 0 0-3.42 1.88V8.98H9.22V21h3.34v-6.3c0-.57.04-1.15.21-1.56.24-.61.79-1.25 1.72-1.25 1.21 0 1.7.92 1.7 2.28V21h3.34l.87-6.9Z" />
    </svg>
  )
}

function GlobeIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.45 3.35 5.44 3.35 9S14.2 18.55 12 21M12 3C9.8 5.45 8.65 8.44 8.65 12S9.8 18.55 12 21" />
    </svg>
  )
}

function normalizeSocialLink(value) {
  if (!value) return ""
  try {
    const trimmed = String(value).trim()
    const parsed = new URL(trimmed.startsWith("http://") || trimmed.startsWith("https://") ? trimmed : `https://${trimmed}`)
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href.slice(0, 200) : ""
  } catch {
    return ""
  }
}

function getSocialPlatform(url) {
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host.includes("facebook.com")) return { name: "Facebook", icon: FacebookIcon, className: "text-[#1877f2]" }
    if (host.includes("twitter.com") || host.includes("x.com")) return { name: "X", icon: XIcon, className: "text-neutral-950" }
    if (host.includes("instagram.com")) return { name: "Instagram", icon: InstagramIcon, className: "text-[#e4405f]" }
    if (host.includes("linkedin.com")) return { name: "LinkedIn", icon: LinkedInIcon, className: "text-[#0a66c2]" }
    return { name: "Website", icon: GlobeIcon, className: "text-[#1d4ed8]" }
  } catch {
    return { name: "Website", icon: GlobeIcon, className: "text-[#1d4ed8]" }
  }
}

function ContactRow({ icon: Icon, label, value, placeholder }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-[clamp(0.75rem,2.8vw,0.85rem)] font-bold text-neutral-900">
        <Icon size={14} />
        {label} :
      </div>
      <p className="pl-0.5 text-[clamp(0.7rem,2.6vw,0.8rem)] text-neutral-600">{value || placeholder}</p>
    </div>
  )
}

// Renders a single "SCAN ME" label centered on one edge of the QR frame.
function ScanMeEdge({ side }) {
  const positionClasses = {
    top: "-top-[7px] left-1/2 -translate-x-1/2 -translate-y-1/2",
    bottom: "-bottom-[7px] left-1/2 -translate-x-1/2 translate-y-1/2",
    left: "-left-[7px] top-1/2 -translate-x-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180",
    right: "-right-[7px] top-1/2 translate-x-1/2 -translate-y-1/2 [writing-mode:vertical-rl]",
  }

  return (
    <span
      className={`absolute select-none whitespace-nowrap bg-white px-1 text-[8px] font-extrabold tracking-[0.15em] text-neutral-900 ${positionClasses[side]}`}
    >
      SCAN ME
    </span>
  )
}

// Open corner-bracket frame (no solid border box), matching the reference design.
function CornerBracket({ corner }) {
  const base = "absolute h-5 w-5 border-neutral-900"
  const variants = {
    "top-left": "top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-md",
    "top-right": "top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-md",
    "bottom-left": "bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-md",
    "bottom-right": "bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-md",
  }
  return <span className={`${base} ${variants[corner]}`} />
}

export function ProfileCardBack({ profile, qrData, hasQrCode, canvasWrapperRef }) {
  const socialLinks = [profile?.social_link1, profile?.social_link2, profile?.social_link3]
    .map(normalizeSocialLink)
    .filter(Boolean)

  return (
    <div className="relative flex h-full w-full flex-col rounded-3xl bg-white" style={{ clipPath: "inset(0 round 1.5rem)" }}>
      {/* decorative bottom-right blob background */}
      <img
        src="/assets/blob-bottom-bg.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full select-none"
      />

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-5 px-[2%] pt-[10%]">
        <div
          ref={canvasWrapperRef}
          className="relative flex items-center justify-center p-2"
        >
          <CornerBracket corner="top-left" />
          <CornerBracket corner="top-right" />
          <CornerBracket corner="bottom-left" />
          <CornerBracket corner="bottom-right" />

          <ScanMeEdge side="top" />
          <ScanMeEdge side="bottom" />
          <ScanMeEdge side="left" />
          <ScanMeEdge side="right" />

          {hasQrCode ? (
            <QRCodeCanvas value={qrData} size={120} includeMargin={false} />
          ) : (
            <div className="flex h-[120px] w-[120px] flex-col items-center justify-center gap-3 text-neutral-400">
              <QrCode size={36} strokeWidth={1.5} />
              <span className="text-center text-xs px-4">
                No QR code yet — generate one to share your profile
              </span>
            </div>
          )}
        </div>



        {/* Social links now live right below the QR code instead of on the front face */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {socialLinks.map((link) => {
              const platform = getSocialPlatform(link)
              const Icon = platform.icon
              return (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={`inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[clamp(0.62rem,2.3vw,0.7rem)] font-medium shadow-sm transition hover:-translate-y-0.5 hover:border-[#1d4ed8]/30 cursor-pointer ${platform.className}`}
                >
                  <Icon size={12} />
                  {platform.name}
                  <ExternalLink size={12} className="opacity-60" />
                </a>
              )
            })}
          </div>
        )}
      </div>

      <div className="relative z-10 flex flex-col gap-3.5 px-[8%] pb-[8%] pt-4">
        <ContactRow icon={Landmark} label="School" value={profile?.school} placeholder="Your School" />
        <ContactRow icon={Home} label="Home Address" value={profile?.home_address} placeholder="Your home address" />
        <ContactRow icon={Phone} label="Contact" value={profile?.contact_number} placeholder="+63 000 000 0000" />
        <ContactRow icon={Mail} label="Email Address" value={profile?.email} placeholder="youremail@example.email" />
        <ContactRow icon={Globe} label="Website" value={profile?.website} placeholder="www.yourwebsite.com" />
      </div>
    </div>
  )
}