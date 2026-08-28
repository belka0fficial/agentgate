import { cn } from '@/lib/utils'

export function Sparkline({
  values,
  className,
}: {
  values: number[]
  className?: string
}) {
  const width = 120
  const height = 30
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(1, values.length - 1)) * width
      const y = height - 2 - ((value - min) / range) * (height - 4)
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role='img'
      aria-label={`History from ${values[0]} to ${values[values.length - 1]}`}
      className={cn('h-8 w-full text-foreground', className)}
      preserveAspectRatio='none'
    >
      <polyline
        points={points}
        fill='none'
        stroke='currentColor'
        strokeWidth='1.5'
        vectorEffect='non-scaling-stroke'
      />
    </svg>
  )
}

export function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div className='min-w-24'>
      <div className='mb-1 flex justify-between gap-3 font-mono text-[11px] text-muted-foreground'>
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-foreground/70'
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  )
}

export function RunDots({ history }: { history: string }) {
  return (
    <div className='flex items-center gap-1' aria-label='Recent run history'>
      {[...history].map((result, index) => (
        <span
          key={index}
          className={cn(
            'size-1.5 rounded-full',
            result === 's'
              ? 'bg-success'
              : result === 'f'
                ? 'bg-destructive'
                : 'bg-muted'
          )}
        />
      ))}
    </div>
  )
}
