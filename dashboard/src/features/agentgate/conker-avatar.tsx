import { cn } from '@/lib/utils'
import type { ConkerEmotion } from './conker-emotions'

export function ConkerAvatar({
  emotion = 'neutral',
  className,
}: {
  emotion?: ConkerEmotion
  className?: string
}) {
  const brow =
    emotion === 'smug'
      ? 'rotate-[-8deg]'
      : emotion === 'annoyed'
        ? 'rotate-[8deg]'
        : emotion === 'focused'
          ? 'scale-x-75'
          : ''
  const mouth =
    emotion === 'smug'
      ? 'M34 45 Q40 50 47 45'
      : emotion === 'annoyed'
        ? 'M34 48 Q40 45 47 48'
        : 'M34 46 Q40 48 47 46'
  return (
    <span
      className={cn(
        'relative inline-grid size-9 place-items-center overflow-hidden rounded-full border border-amber-300/30 bg-gradient-to-br from-amber-800 via-orange-600 to-amber-950 shadow-sm shadow-black/30',
        className
      )}
      aria-label='Conker companion avatar'
      role='img'
      data-emotion={emotion}
    >
      <svg viewBox='0 0 80 80' className='size-full' aria-hidden='true'>
        <path
          d='M22 18 C12 8 6 15 13 28 C4 31 5 43 17 43 C15 56 27 68 42 67 C58 66 68 53 64 39 C75 30 67 17 55 24 C48 13 34 10 22 18Z'
          fill='#9a4f18'
        />
        <path d='M18 21 C12 16 10 20 16 29' fill='#e6a45a' />
        <path d='M56 25 C63 22 66 27 60 34' fill='#e6a45a' />
        <ellipse cx='40' cy='42' rx='23' ry='21' fill='#c8752d' />
        <ellipse cx='40' cy='49' rx='15' ry='12' fill='#efc083' />
        <circle cx='31' cy='39' r='4' fill='#101010' />
        <circle cx='49' cy='39' r='4' fill='#101010' />
        <circle cx='32.4' cy='37.5' r='1.2' fill='white' />
        <circle cx='50.4' cy='37.5' r='1.2' fill='white' />
        <path
          className={brow}
          d='M25 32 L36 30'
          stroke='#3a1a0a'
          strokeWidth='3'
          strokeLinecap='round'
        />
        <path
          className={brow}
          d='M45 30 L56 32'
          stroke='#3a1a0a'
          strokeWidth='3'
          strokeLinecap='round'
        />
        <path
          d='M36 43 Q40 46 44 43'
          fill='none'
          stroke='#5b260d'
          strokeWidth='2'
          strokeLinecap='round'
        />
        <path
          d={mouth}
          fill='none'
          stroke='#5b260d'
          strokeWidth='2.5'
          strokeLinecap='round'
        />
        <path d='M53 12 C69 7 76 18 68 29 C66 18 60 16 53 12Z' fill='#b45f1f' />
      </svg>
    </span>
  )
}
