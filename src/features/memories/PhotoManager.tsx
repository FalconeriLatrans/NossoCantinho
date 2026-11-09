import { ImagePlus, Trash2 } from 'lucide-react'
import { useId, useRef } from 'react'
import { PhotoImage } from '../../components/ui/PhotoImage'
import { useObjectUrl } from '../../hooks/useObjectUrl'
import type { PhotoDraft } from '../../types'
import { createId } from '../../utils/id'

interface PhotoManagerProps {
  photos: PhotoDraft[]
  coverId: string | null
  onChange: (photos: PhotoDraft[], coverId: string | null) => void
}

/**
 * Gerencia fotos já salvas e novas (ainda não salvas) num único lugar:
 * adicionar, remover e escolher a capa entre todas elas.
 */
export function PhotoManager({ photos, coverId, onChange }: PhotoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const radioName = useId()

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return
    const added = Array.from(files)
      .filter((file) => file.type.startsWith('image/'))
      .map((file) => ({ id: createId(), file }))
    if (!added.length) return
    const next = [...photos, ...added]
    onChange(next, coverId ?? next[0].id)
    // Permite selecionar o mesmo arquivo novamente depois de removê-lo.
    if (inputRef.current) inputRef.current.value = ''
  }

  const remove = (id: string) => {
    const next = photos.filter((p) => p.id !== id)
    onChange(next, coverId === id ? (next[0]?.id ?? null) : coverId)
  }

  return (
    <fieldset className="field-group">
      <legend>Fotografias {photos.length > 0 && '· escolha a capa'}</legend>

      <div className="photo-manager">
        {photos.map((photo) => (
          <div className={`photo-manager__item ${photo.id === coverId ? 'is-cover' : ''}`} key={photo.id}>
            <PhotoThumb photo={photo} />
            <label className="check check--small">
              <input
                type="radio"
                name={radioName}
                checked={photo.id === coverId}
                onChange={() => onChange(photos, photo.id)}
              />
              Capa
            </label>
            <button
              type="button"
              className="icon-btn icon-btn--danger"
              onClick={() => remove(photo.id)}
              aria-label="Remover foto"
              title="Remover foto"
            >
              <Trash2 aria-hidden />
            </button>
          </div>
        ))}

        <label className="photo-manager__add">
          <ImagePlus aria-hidden />
          <span>Adicionar</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addFiles(e.target.files)}
            className="visually-hidden"
          />
        </label>
      </div>
    </fieldset>
  )
}

function PhotoThumb({ photo }: { photo: PhotoDraft }) {
  const previewUrl = useObjectUrl(photo.file)
  if (photo.file) {
    return previewUrl ? <img src={previewUrl} alt="" className="photo-manager__img" /> : <div className="photo-manager__img" />
  }
  return <PhotoImage photoId={photo.id} alt="" className="photo-manager__img" />
}
