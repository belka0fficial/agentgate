import { useEffect, useRef } from 'react'

import type { CoreState } from '../event-bus'

type CoreProps = {
  state: CoreState
  intensity?: number
  size?: 'mini' | 'medium' | 'large'
}

const stateColor: Record<CoreState, string> = {
  idle: '#35E0C8',
  listening: '#35E0C8',
  thinking: '#35E0C8',
  speaking: '#35E0C8',
  executing: '#35E0C8',
  blocked: '#FFB454',
  error: '#FF4D5E',
}

export function Core({ state, intensity = 0.2, size = 'mini' }: CoreProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    let frame = 0
    let raf = 0
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    canvas.width = Math.floor(rect.width * ratio)
    canvas.height = Math.floor(rect.height * ratio)
    context.scale(ratio, ratio)

    const draw = () => {
      const width = rect.width
      const height = rect.height
      const cx = width / 2
      const cy = height / 2
      const radius = Math.min(width, height) * 0.31
      const color = stateColor[state]
      const speed = {
        idle: 0.006,
        listening: 0.018,
        thinking: 0.052,
        speaking: 0.03 + intensity * 0.05,
        executing: 0.04,
        blocked: 0.012,
        error: 0.01,
      }[state]
      const pulse = reduce ? 0 : Math.sin(frame * speed) * (state === 'idle' ? 1.2 : 4.4)
      const executingPulse = state === 'executing' ? Math.max(0, Math.sin(frame * 0.18)) * 9 : 0
      const errorFlash = state === 'error' && frame < 18 ? (18 - frame) / 18 : 0

      context.clearRect(0, 0, width, height)
      context.lineWidth = 1
      context.strokeStyle = color
      context.globalAlpha = state === 'idle' ? 0.46 : 0.72
      context.beginPath()
      context.arc(cx, cy, radius + pulse + executingPulse, 0, Math.PI * 2)
      context.stroke()

      context.globalAlpha = state === 'blocked' ? 0.58 : 0.34 + errorFlash * 0.38
      context.beginPath()
      context.arc(cx, cy, radius * 0.62 - pulse * 0.35, frame * speed, Math.PI * 1.72 + frame * speed)
      context.stroke()

      context.globalAlpha = 0.9
      const particles = size === 'mini' ? 14 : size === 'medium' ? 22 : 30
      for (let i = 0; i < particles; i += 1) {
        const angle = (Math.PI * 2 * i) / particles + frame * speed * (i % 3 === 0 ? -1 : 1)
        const orbit = radius + Math.sin(frame * speed + i) * (state === 'speaking' ? 5 + intensity * 9 : 2.2)
        const x = cx + Math.cos(angle) * orbit
        const y = cy + Math.sin(angle) * orbit
        context.fillStyle = color
        context.globalAlpha = 0.24 + ((i % 5) / 10)
        context.fillRect(x, y, 1.5, 1.5)
      }

      frame += 1
      if (!reduce) raf = window.requestAnimationFrame(draw)
    }

    draw()
    return () => window.cancelAnimationFrame(raf)
  }, [intensity, size, state])

  return <canvas className={`core core-${size}`} data-state={state} ref={canvasRef} aria-label={`Agent core ${state}`} />
}
