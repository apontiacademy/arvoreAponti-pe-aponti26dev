import { useRef, type ChangeEvent } from 'react'
import { Camera } from 'lucide-react'
import { toast } from 'sonner'
import { LumaSpin } from '@/components/ui/luma-spin'
import { useUploadPageAvatar } from '@/features/pages/useUploadPageAvatar'

interface AvatarUploaderProps {
  pageId: string
  ownerId: string
  avatarUrl: string | null
}

export function AvatarUploader({ pageId, ownerId, avatarUrl }: AvatarUploaderProps) {
  const uploadAvatar = useUploadPageAvatar()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    uploadAvatar.mutate(
      { pageId, ownerId, file },
      {
        onSuccess: () => toast.success('Foto atualizada.'),
        onError: () => toast.error('Não foi possível enviar a foto.'),
      },
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-muted">
        {uploadAvatar.isPending ? (
          <div className="flex size-full items-center justify-center">
            <LumaSpin className="w-8" />
          </div>
        ) : (
          avatarUrl && <img src={avatarUrl} alt="Foto da árvore" className="size-full object-cover" />
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Alterar foto"
          className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent outline-none transition hover:bg-black/40 hover:text-white focus-visible:bg-black/40 focus-visible:text-white focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Camera className="size-5" />
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        data-testid="avatar-input"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
