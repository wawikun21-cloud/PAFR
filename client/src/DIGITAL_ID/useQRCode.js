import { useCallback, useRef, useState } from "react"
import { toast } from "sonner"
import { generateProfileQrCode } from "@/services/profileService"

/**
 * Owns everything QR-related: first-time generation against the backend,
 * and exporting the rendered <QRCodeCanvas> to a downloadable PNG.
 * The visual QR itself is rendered by the caller (ProfileCardBack) using
 * the `qrData` this hook returns — this hook never touches markup.
 */
export function useQRCode(profile, setProfile) {
  const [isGenerating, setIsGenerating] = useState(false)
  const canvasWrapperRef = useRef(null)

  const qrData = profile?.qr_data || null
  const hasQrCode = Boolean(qrData)

  const generateQrCode = useCallback(async () => {
    setIsGenerating(true)
    try {
      const updated = await generateProfileQrCode()
      setProfile((prev) => ({ ...prev, ...updated }))
      toast.success("QR code generated")
    } catch (error) {
      toast.error(error.message || "Failed to generate QR code")
    } finally {
      setIsGenerating(false)
    }
  }, [setProfile])

  const downloadQrCode = useCallback(() => {
    const canvas = canvasWrapperRef.current?.querySelector("canvas")
    if (!canvas) {
      toast.error("QR code isn't ready yet")
      return
    }

    const link = document.createElement("a")
    link.download = `${profile?.full_name?.replace(/\s+/g, "_") || "profile"}-qrcode.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [profile])

  return {
    qrData,
    hasQrCode,
    isGenerating,
    canvasWrapperRef,
    generateQrCode,
    downloadQrCode,
  }
}
