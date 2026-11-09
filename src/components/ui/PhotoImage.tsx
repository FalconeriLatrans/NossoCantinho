import { Heart, ImageOff } from 'lucide-react'
import { usePhotoUrl } from '../../hooks/usePhotoUrl'
import type { PhotoRef } from '../../types'

interface PhotoImageProps {
  photo: PhotoRef | null | undefined
  alt: string
  className?: string
}

/** Exibe uma foto salva, com placeholder enquanto carrega ou se faltar. */
export function PhotoImage({ photo: ref, alt, className }: PhotoImageProps) {
  const photo = usePhotoUrl(ref)

  if (photo.status === 'ready') {
    return <img src={photo.url} alt={alt} className={className} loading="lazy" decoding="async" />
  }
  return (
    <div className={`photo-placeholder ${className ?? ''}`} aria-hidden>
      {photo.status === 'missing' && ref ? <ImageOff /> : <Heart />}
    </div>
  )
}
