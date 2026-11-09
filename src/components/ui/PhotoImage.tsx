import { Heart, ImageOff } from 'lucide-react'
import { usePhotoUrl } from '../../hooks/usePhotoUrl'

interface PhotoImageProps {
  photoId: string | null | undefined
  alt: string
  className?: string
}

/** Exibe uma foto guardada no IndexedDB, com placeholder enquanto carrega ou se faltar. */
export function PhotoImage({ photoId, alt, className }: PhotoImageProps) {
  const photo = usePhotoUrl(photoId)

  if (photo.status === 'ready') {
    return <img src={photo.url} alt={alt} className={className} loading="lazy" decoding="async" />
  }
  return (
    <div className={`photo-placeholder ${className ?? ''}`} aria-hidden>
      {photo.status === 'missing' && photoId ? <ImageOff /> : <Heart />}
    </div>
  )
}
