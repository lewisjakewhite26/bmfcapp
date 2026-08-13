export const SPONSOR_LOGO_MAX_BYTES = 2 * 1024 * 1024
export const SPONSOR_LOGO_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'
export const SPONSOR_NAME_MAX_LENGTH = 80

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function validateSponsorLogoFile(file: File): void {
  if (!MIME_TO_EXT[file.type]) {
    throw new Error('Use a JPEG, PNG, WebP or GIF image')
  }
  if (file.size > SPONSOR_LOGO_MAX_BYTES) {
    throw new Error('Logo must be 2MB or smaller')
  }
}

export function sponsorLogoFileExt(file: File): string {
  const ext = MIME_TO_EXT[file.type]
  if (!ext) throw new Error('Use a JPEG, PNG, WebP or GIF image')
  return ext
}
