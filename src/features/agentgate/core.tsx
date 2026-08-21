import { useEffect, useRef } from 'react'

export function Core() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return
    const size = 250
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * ratio
    canvas.height = size * ratio
    context.scale(ratio, ratio)
    const cx = size / 2
    const cy = size / 2
    const radius = 77
    context.clearRect(0, 0, size, size)
    context.strokeStyle = '#737373'
    context.lineWidth = 1
    context.globalAlpha = 0.55
    context.beginPath()
    context.arc(cx, cy, radius, 0, Math.PI * 2)
    context.stroke()
    context.globalAlpha = 0.35
    context.beginPath()
    context.arc(cx, cy, radius * 0.62, -0.5, Math.PI * 1.26)
    context.stroke()
    for (let i = 0; i < 108; i += 1) {
      const angle = (Math.PI * 2 * i) / 108
      const grain = Math.sin(i * 2.39) * radius * 0.18
      const orbit = radius * (0.56 + ((i * 13) % 31) / 49) + grain
      const x = cx + Math.cos(angle) * orbit
      const y = cy + Math.sin(angle) * orbit * 0.82
      context.fillStyle = '#737373'
      context.globalAlpha = 0.22 + (i % 5) / 18
      context.fillRect(x, y, 1.25, 1.25)
      if (i % 7 === 0) {
        context.globalAlpha *= 0.3
        context.beginPath()
        context.moveTo(x, y)
        context.lineTo(
          cx + Math.cos(angle + 0.42) * radius * 0.34,
          cy + Math.sin(angle + 0.42) * radius * 0.28
        )
        context.stroke()
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className='block size-[250px] max-w-full'
      aria-label='Agent core idle'
    />
  )
}
