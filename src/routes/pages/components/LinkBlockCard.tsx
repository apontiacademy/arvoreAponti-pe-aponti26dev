import { useEffect, useRef, useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useUpdateLink } from '@/features/links/useUpdateLink'
import { useDeleteLink } from '@/features/links/useDeleteLink'
import { LINK_TYPE_MAP, type LinkType } from '@/features/links/linkTypes'
import { validateLabelField, validateUrlField } from '@/features/links/linkValidation'
import type { Link } from '@/features/links/useLinks'

const AUTOSAVE_DELAY_MS = 800

interface LinkBlockCardProps {
  link: Link
  onDragEnd?: () => void
}

export function LinkBlockCard({ link, onDragEnd }: LinkBlockCardProps) {
  const dragControls = useDragControls()
  const updateLink = useUpdateLink()
  const deleteLink = useDeleteLink()

  const config = LINK_TYPE_MAP[link.type as LinkType]
  const Icon = config.icon

  const [label, setLabel] = useState(link.label ?? '')
  const [url, setUrl] = useState(link.url ?? '')
  const [labelTouched, setLabelTouched] = useState(false)
  const [urlTouched, setUrlTouched] = useState(false)
  const snapshotRef = useRef(JSON.stringify({ label: link.label ?? '', url: link.url ?? '' }))
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  const labelError = validateLabelField(link.type as LinkType, label)
  const urlError = config.hasUrl ? validateUrlField(link.type as LinkType, url) : null

  useEffect(() => {
    const current = { label, url }
    const serialized = JSON.stringify(current)
    if (serialized === snapshotRef.current) return

    if (labelError || urlError) {
      setSaveStatus('idle')
      return
    }

    setSaveStatus('saving')
    const timeout = setTimeout(() => {
      updateLink.mutate(
        { id: link.id, values: { label: label || null, url: url || null } },
        {
          onSuccess: () => {
            snapshotRef.current = serialized
            setSaveStatus('saved')
          },
          onError: () => setSaveStatus('error'),
        },
      )
    }, AUTOSAVE_DELAY_MS)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [label, url, labelError, urlError])

  function handleToggleActive(checked: boolean) {
    updateLink.mutate({ id: link.id, values: { is_active: checked } })
  }

  function handleDelete() {
    deleteLink.mutate({ id: link.id, pageId: link.page_id })
  }

  return (
    <Reorder.Item
      value={link.id}
      dragListener={false}
      dragControls={dragControls}
      onDragEnd={onDragEnd}
      className="flex items-start gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
    >
      <button
        type="button"
        onPointerDown={(event) => dragControls.start(event)}
        className="mt-1.5 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
        aria-label="Reordenar bloco"
      >
        <GripVertical className="size-4" />
      </button>

      <Icon className="mt-1.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-muted-foreground">{config.label}</span>
          <span className="text-xs text-muted-foreground">
            {saveStatus === 'saving' && 'Salvando...'}
            {saveStatus === 'saved' && 'Salvo'}
            {saveStatus === 'error' && 'Erro ao salvar'}
          </span>
        </div>

        {link.type === 'text' ? (
          <Textarea
            aria-label="Texto"
            placeholder="Escreva um texto..."
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={() => setLabelTouched(true)}
          />
        ) : (
          <Input
            aria-label={link.type === 'title' ? 'Título' : 'Texto do botão'}
            placeholder={link.type === 'title' ? 'Título' : 'Texto do botão (opcional)'}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            onBlur={() => setLabelTouched(true)}
          />
        )}
        {labelTouched && labelError && <p className="text-xs text-destructive">{labelError}</p>}

        {config.hasUrl && (
          <>
            <Input
              aria-label={config.valueLabel}
              placeholder={config.valuePlaceholder}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onBlur={() => setUrlTouched(true)}
            />
            {urlTouched && urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <Switch
          checked={link.is_active}
          onCheckedChange={handleToggleActive}
          aria-label={link.is_active ? 'Bloco ativo' : 'Bloco inativo'}
        />
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="ghost" size="icon-sm" aria-label="Excluir bloco" />}
          >
            <Trash2 className="size-4" />
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir bloco</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este bloco &quot;{config.label}&quot;? Essa ação
                não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleDelete}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Reorder.Item>
  )
}
