import { useEffect, useRef } from 'react'

import type { CoreState } from '../event-bus'

type CoreProps = {
  state: CoreState
  intensity?: number
  size?: 'mini' | 'medium' | 'large'
}

const stateColor: Record<CoreState, string> = {
  idle: '#C8CFDA',
  listening: '#C8CFDA',
  thinking: '#C8CFDA',
  speaking: '#C8CFDA',
  executing: '#C8CFDA',
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
      const shape = {
        idle: 0,
        listening: 2,
        thinking: -3,
        speaking: 4 + intensity * 4,
        executing: 6,
        blocked: 3,
        error: -2,
      }[state]

      context.clearRect(0, 0, width, height)
      context.lineWidth = 1
      context.strokeStyle = color
      context.globalAlpha = state === 'idle' ? 0.42 : 0.7
      context.beginPath()
      context.arc(cx, cy, radius + shape, 0, Math.PI * 2)
      context.stroke()

      context.globalAlpha = state === 'blocked' ? 0.58 : 0.32
      context.beginPath()
      context.arc(cx, cy, radius * 0.62 - shape * 0.25, -0.5, Math.PI * 1.26)
      context.stroke()

      const particles = size === 'mini' ? 22 : size === 'medium' ? 108 : 180
      for (let i = 0; i < particles; i += 1) {
        const angle = (Math.PI * 2 * i) / particles
        const grain = Math.sin(i * 2.39) * radius * 0.18
        const orbit = radius * (0.56 + ((i * 13) % 31) / 49) + grain + shape * Math.sin(i * 1.7)
        const x = cx + Math.cos(angle) * orbit
        const y = cy + Math.sin(angle) * orbit * 0.82
        context.fillStyle = color
        context.globalAlpha = state === 'idle' ? 0.24 + ((i % 5) / 18) : 0.34 + ((i % 5) / 13)
        context.fillRect(x, y, size === 'mini' ? 1 : 1.25, size === 'mini' ? 1 : 1.25)
        if (i % 7 === 0) {
          context.globalAlpha *= 0.3
          context.beginPath()
          context.moveTo(x, y)
          context.lineTo(cx + Math.cos(angle + 0.42) * radius * 0.34, cy + Math.sin(angle + 0.42) * radius * 0.28)
          context.stroke()
        }
      }
    }

    draw()
  }, [intensity, size, state])

  return <canvas className={`core core-${size}`} data-state={state} ref={canvasRef} aria-label={`Agent core ${state}`} />
}
