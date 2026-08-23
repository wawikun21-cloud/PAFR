import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useProfile } from "@/hooks/useProfile"
import { useQRCode } from "@/hooks/useQRCode"
import { ProfileCard } from "@/components/profile/ProfileCard"
import { EditProfileDialog } from "@/components/profile/EditProfileDialog"
import { Loader2, Pencil, QrCode, Download, ChevronDown } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function ProfilePage() {
  const {
    profile,
    setProfile,
    editable,
    isLoading,
    profileError,
    isEditing,
    isSaving,
    avatarPreview,
    handleFieldChange,
    handleAvatarSelect,
    openEdit,
    cancelEdit,
    saveProfile,
    fetchProfile,
  } = useProfile()
  const { isGenerating, generateQrCode, qrData, hasQrCode, canvasWrapperRef, downloadQrCode } = useQRCode(profile, setProfile)

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Profile Info
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            View and edit your personal information and yearbook details.
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <QrCode size={16} />
                QR CODE
                <ChevronDown size={14} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={generateQrCode} disabled={isLoading || isGenerating}>
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
                Generate QR
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadQrCode} disabled={isLoading || !hasQrCode}>
                <Download size={16} />
                Download QR
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openEdit} disabled={isLoading} className="gap-2">
            <Pencil size={16} />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="flex w-full justify-center">
        {isLoading ? (
          <Skeleton className="aspect-[3/5] w-full max-w-[clamp(260px,80vw,360px)] rounded-3xl" />
        ) : profileError ? (
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-6 text-center w-full max-w-[clamp(260px,80vw,360px)]">
            <AlertTriangle size={32} className="mx-auto mb-3 text-red-500" />
            <p className="text-sm font-medium text-[var(--text-primary)] mb-2">Failed to load profile</p>
            <p className="text-xs text-[var(--text-muted)] mb-4">{profileError}</p>
            <Button variant="outline" size="sm" onClick={fetchProfile} className="gap-2">
              <RefreshCw size={14} />
              Retry
            </Button>
          </div>
        ) : (
          <ProfileCard
            profile={profile}
            avatarPreview={avatarPreview}
            isEditing={false}
            onAvatarSelect={handleAvatarSelect}
            canvasWrapperRef={canvasWrapperRef}
            qrData={qrData}
            hasQrCode={hasQrCode}
          />
        )}
      </div>

      <EditProfileDialog
        open={isEditing}
        onOpenChange={(open) => !open && cancelEdit()}
        editable={editable}
        onFieldChange={handleFieldChange}
        onSave={saveProfile}
        onCancel={cancelEdit}
        isSaving={isSaving}
        avatarPreview={avatarPreview}
        currentAvatarUrl={profile?.avatar_url}
        onAvatarSelect={handleAvatarSelect}
      />
    </main>
  )
}