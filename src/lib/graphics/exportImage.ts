import { canvasToPngBlob } from './render'

export interface ExportFile {
  canvas: HTMLCanvasElement
  fileName: string
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function downloadGraphics(files: ExportFile[]): Promise<void> {
  for (const f of files) {
    downloadBlob(await canvasToPngBlob(f.canvas), f.fileName)
  }
}

export function canShareFiles(): boolean {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

/** Opens the phone's share sheet (Facebook, Instagram, WhatsApp…). Returns false if the user cancelled. */
export async function shareGraphics(files: ExportFile[], text?: string): Promise<boolean> {
  const shareFiles = await Promise.all(
    files.map(async (f) => new File([await canvasToPngBlob(f.canvas)], f.fileName, { type: 'image/png' })),
  )
  try {
    await navigator.share({ files: shareFiles, text })
    return true
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return false
    throw err
  }
}
