import { useState } from 'react'
import { playerInitials } from '../../lib/format'
import { resolvePlayerPhotoUrl } from '../../lib/playerPhotoUrl'

type AvatarSize = 'sm' | 'md' | 'lg'
type AvatarVariant = 'hero' | 'admin'

const sizeClasses: Record<AvatarSize, { box: string; text: string }> = {
  sm: { box: 'w-10 h-10 rounded-full', text: 'text-sm' },
  md: { box: 'w-12 h-12 rounded-full', text: 'text-sm' },
  lg: { box: 'w-24 h-24 rounded-2xl', text: 'text-3xl' },
}

const variantClasses: Record<AvatarVariant, { img: string; fallback: string }> = {
  hero: {
    img: 'border border-white/20 shadow-lg',
    fallback: 'bg-white/15 backdrop-blur border border-white/20 text-white shadow-lg',
  },
  admin: {
    img: 'border border-brand-blue/15',
    fallback: 'bg-brand-blue text-white border border-brand-blue/15',
  },
}

interface PlayerPhotoAvatarProps {
  displayName: string
  photoUrl?: string | null
  size?: AvatarSize
  variant?: AvatarVariant
  className?: string
}

export function PlayerPhotoAvatar({
  displayName,
  photoUrl,
  size = 'lg',
  variant = 'hero',
  className = '',
}: PlayerPhotoAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const resolved = resolvePlayerPhotoUrl(photoUrl)
  const { box, text } = sizeClasses[size]
  const styles = variantClasses[variant]

  if (resolved && !imgError) {
    return (
      <img
        src={resolved}
        alt=""
        className={`${box} object-cover ${styles.img} ${className}`}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className={`${box} flex items-center justify-center font-display font-bold ${text} ${styles.fallback} ${className}`}
      aria-hidden
    >
      {playerInitials(displayName)}
    </div>
  )
}
