export const PLAYER_PHOTO_MAX_BYTES = 2 * 1024 * 1024
export const PLAYER_PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function validatePlayerPhotoFile(file: File): void {
  if (!MIME_TO_EXT[file.type]) {
    throw new Error('Use a JPEG, PNG, WebP or GIF image')
  }
  if (file.size > PLAYER_PHOTO_MAX_BYTES) {
    throw new Error('Photo must be 2MB or smaller')
  }
}

export function playerPhotoFileExt(file: File): string {
  const ext = MIME_TO_EXT[file.type]
  if (!ext) throw new Error('Use a JPEG, PNG, WebP or GIF image')
  return ext
}
