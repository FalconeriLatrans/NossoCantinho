import { PHOTO_SETTINGS } from '../constants'

export class ImageProcessingError extends Error {}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new ImageProcessingError(`Não foi possível ler a imagem "${file.name}".`))
    }
    img.src = url
  })
}

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      // `from-image` respeita a orientação EXIF (fotos de celular "deitadas").
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      /* cai no fallback abaixo */
    }
  }
  const img = await loadImageElement(file)
  return { source: img, width: img.naturalWidth, height: img.naturalHeight }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Redimensiona e comprime uma foto antes de salvar.
 * Fotos de celular têm 3–8 MB; depois disso ficam em ~200–400 KB.
 */
export async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/')) {
    throw new ImageProcessingError(`"${file.name}" não é uma imagem.`)
  }
  if (file.size > PHOTO_SETTINGS.maxFileBytes) {
    throw new ImageProcessingError(`"${file.name}" é grande demais (máx. 25 MB).`)
  }

  const { source, width, height, close } = await decode(file)
  try {
    if (!width || !height) throw new ImageProcessingError(`Não foi possível ler a imagem "${file.name}".`)

    const scale = Math.min(1, PHOTO_SETTINGS.maxDimension / Math.max(width, height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new ImageProcessingError('Seu navegador não permitiu processar a imagem.')
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height)

    // Safari antigo não gera WebP (devolve PNG): nesse caso usa JPEG.
    let blob = await canvasToBlob(canvas, 'image/webp', PHOTO_SETTINGS.quality)
    if (!blob || blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', PHOTO_SETTINGS.quality)
    if (!blob) throw new ImageProcessingError(`Não foi possível comprimir "${file.name}".`)
    // Se a "compressão" ficou maior (imagem pequena já otimizada), mantém o original
    // — desde que seja um formato aceito pelo Storage.
    return blob.size >= file.size && ACCEPTED_TYPES.includes(file.type) ? file : blob
  } finally {
    close?.()
  }
}
