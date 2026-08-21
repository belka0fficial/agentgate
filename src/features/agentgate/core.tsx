import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Particle = {
  theta: number
  z: number
  seed: number
}

type Point = {
  x: number
  y: number
  depth: number
  energy: number
}

const CORE_FORMS = [
  'neural cluster',
  'specimen bloom',
  'folded membrane',
  'branching filaments',
  'orbital lattice',
] as const

type CoreForm = (typeof CORE_FORMS)[number]

const TAU = Math.PI * 2
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const MORPH_SECONDS = 2.8

export function Core({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [formLabel, setFormLabel] = useState<CoreForm>(CORE_FORMS[0])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const reducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const size = Math.round(canvas.getBoundingClientRect().width) || 250
    const particles = makeParticles(
      size >= 420 ? 980 : window.innerWidth < 640 ? 380 : 620
    )
    canvas.width = size * ratio
    canvas.height = size * ratio
    context.setTransform(ratio, 0, 0, ratio, 0, 0)

    let frame = 0
    let origin = performance.now()
    let currentForm = 0
    let nextForm = 0
    let morphStartedAt = -1
    let nextMorphAt = randomBetween(7.5, 12.5)
    let formBag = shuffledFormBag(currentForm)

    const selectNextForm = () => {
      if (formBag.length === 0) formBag = shuffledFormBag(currentForm)
      nextForm = formBag.pop() ?? (currentForm + 1) % CORE_FORMS.length
      morphStartedAt = -2
      setFormLabel(CORE_FORMS[nextForm])
    }

    const draw = (now: number) => {
      const elapsed = reducedMotion ? 7.25 : (now - origin) / 1000
      const cx = size / 2
      const cy = size / 2 + 4
      const scale = size * 0.288
      const renderScale = Math.min(Math.sqrt(size / 250), 1.5)
      const yaw = elapsed * 0.071 + Math.sin(elapsed * 0.113) * 0.22
      const pitch = Math.sin(elapsed * 0.089) * 0.15
      const breath = 1 + Math.sin(elapsed * 0.173) * 0.035

      if (
        !reducedMotion &&
        currentForm === nextForm &&
        elapsed >= nextMorphAt
      ) {
        selectNextForm()
      }
      if (morphStartedAt === -2) morphStartedAt = elapsed

      const morphProgress =
        currentForm === nextForm
          ? 0
          : smootherStep(
              clamp((elapsed - morphStartedAt) / MORPH_SECONDS, 0, 1)
            )

      context.clearRect(0, 0, size, size)
      drawField(context, cx, cy, scale, elapsed, morphProgress)

      for (let index = 0; index < particles.length; index += 1) {
        const particle = particles[index]
        const from = projectParticle(
          currentForm,
          particle,
          index,
          particles.length,
          elapsed,
          yaw,
          pitch
        )
        const to = projectParticle(
          nextForm,
          particle,
          index,
          particles.length,
          elapsed,
          yaw,
          pitch
        )
        const point = mixPoint(from, to, morphProgress)
        const perspective = 0.9 + (point.depth + 1) * 0.085
        const turbulence =
          Math.sin(particle.seed * 11.7 + elapsed * 0.191) * 0.018 +
          Math.cos(particle.seed * 7.3 - elapsed * 0.127) * 0.014
        const x = cx + point.x * scale * breath * perspective
        const y = cy + (point.y + turbulence * 0.55) * scale * breath
        const depth = (point.depth + 1) / 2
        const spectralBand =
          Math.sin(
            particle.theta * 1.71 +
              particle.z * 3.4 -
              elapsed * 0.233 +
              point.energy * 1.7
          ) *
            0.5 +
          0.5
        const alive = spectralBand > 0.68 && index % 5 < 2

        context.globalAlpha = 0.18 + depth * 0.56 + point.energy * 0.08
        context.fillStyle = alive
          ? spectralColor(index, elapsed)
          : depth > 0.56
            ? '#c8cfda'
            : '#586170'
        const pointSize =
          (0.48 + depth * 0.78 + point.energy * 0.18) * renderScale
        context.fillRect(x, y, pointSize, pointSize)

        if (index % 31 === 0) {
          const targetIndex = (index + 89) % particles.length
          const targetParticle = particles[targetIndex]
          const targetFrom = projectParticle(
            currentForm,
            targetParticle,
            targetIndex,
            particles.length,
            elapsed,
            yaw,
            pitch
          )
          const targetTo = projectParticle(
            nextForm,
            targetParticle,
            targetIndex,
            particles.length,
            elapsed,
            yaw,
            pitch
          )
          const target = mixPoint(targetFrom, targetTo, morphProgress)
          const tx = cx + target.x * scale * 0.96
          const ty = cy + target.y * scale * 0.96

          context.globalAlpha = alive ? 0.16 : 0.055
          context.strokeStyle = alive
            ? spectralColor(index + 11, elapsed)
            : '#c8cfda'
          context.lineWidth = 0.45
          context.beginPath()
          context.moveTo(x, y)
          context.quadraticCurveTo(
            cx + Math.sin(elapsed * 0.07 + index) * 8,
            cy + Math.cos(elapsed * 0.061 + index) * 8,
            tx,
            ty
          )
          context.stroke()
        }
      }

      drawSignalTrace(context, cx, cy, scale, elapsed, currentForm, nextForm)
      context.globalAlpha = 1

      if (currentForm !== nextForm && morphProgress >= 1) {
        currentForm = nextForm
        morphStartedAt = -1
        nextMorphAt = elapsed + randomBetween(7.5, 12.5)
      }

      if (!reducedMotion) frame = requestAnimationFrame(draw)
    }

    const onVisibility = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden && !reducedMotion) {
        origin = performance.now() - 1000 * Math.random() * 120
        currentForm = Math.floor(Math.random() * CORE_FORMS.length)
        nextForm = currentForm
        formBag = shuffledFormBag(currentForm)
        morphStartedAt = -1
        nextMorphAt = randomBetween(4, 9)
        setFormLabel(CORE_FORMS[currentForm])
        frame = requestAnimationFrame(draw)
      }
    }

    draw(performance.now())
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div
      className={cn('relative size-[250px] max-w-full', className)}
      aria-label='Hermes live specimen'
      data-core-form={formLabel}
    >
      <canvas ref={canvasRef} className='block size-full' aria-hidden='true' />
      <span className='pointer-events-none absolute top-2 left-2 font-mono text-[8px] tracking-[0.14em] text-muted-foreground/55 uppercase'>
        specimen / Hermes
      </span>
      <span className='pointer-events-none absolute right-2 bottom-2 font-mono text-[8px] tracking-[0.14em] text-muted-foreground/55 uppercase'>
        form / {formLabel}
      </span>
    </div>
  )
}

function projectParticle(
  form: number,
  particle: Particle,
  index: number,
  count: number,
  elapsed: number,
  yaw: number,
  pitch: number
): Point {
  if (form === 1) return projectBloom(particle, elapsed, yaw)
  if (form === 2) return projectMembrane(particle, elapsed, yaw)
  if (form === 3) return projectFilament(particle, index, count, elapsed, yaw)
  if (form === 4) return projectOrbit(particle, index, count, elapsed, yaw)
  return projectCluster(particle, elapsed, yaw, pitch)
}

function projectCluster(
  particle: Particle,
  elapsed: number,
  yaw: number,
  pitch: number
): Point {
  const sphereRadius = Math.sqrt(1 - particle.z * particle.z)
  const theta = particle.theta + yaw
  const rawX = Math.cos(theta) * sphereRadius
  const rawDepth = Math.sin(theta) * sphereRadius
  const rawY = particle.z
  const foldedY = rawY * Math.cos(pitch) - rawDepth * Math.sin(pitch)
  const foldedDepth = rawY * Math.sin(pitch) + rawDepth * Math.cos(pitch)
  const lobe =
    1 +
    Math.sin(theta * 3.07 + rawY * 4.1 + elapsed * 0.137) * 0.11 +
    Math.cos(theta * 5.03 - rawY * 2.8 - elapsed * 0.097) * 0.055

  return {
    x: rawX * lobe + Math.sin(rawY * 7 + elapsed * 0.11) * 0.03,
    y: foldedY * lobe,
    depth: foldedDepth,
    energy: Math.abs(Math.sin(theta * 2.1 + rawY * 3.2)),
  }
}

function projectBloom(particle: Particle, elapsed: number, yaw: number): Point {
  const radius = Math.sqrt((particle.z + 1) / 2)
  const angle = particle.theta + yaw * 0.31
  const petal =
    0.68 +
    Math.cos(angle * 5 - elapsed * 0.079) * 0.22 +
    Math.sin(angle * 10 + elapsed * 0.047) * 0.055
  const curl = Math.sin(radius * Math.PI * 2.4 - elapsed * 0.123) * 0.12
  const depth =
    Math.sin(angle * 5 + elapsed * 0.083) * (1 - radius) + curl * 0.8

  return {
    x: Math.cos(angle + curl) * radius * petal * 1.12,
    y: Math.sin(angle + curl) * radius * petal * 0.9 - (1 - radius) * 0.16,
    depth,
    energy: 1 - Math.abs(radius - 0.68),
  }
}

function projectMembrane(
  particle: Particle,
  elapsed: number,
  yaw: number
): Point {
  const angle = particle.theta + yaw * 0.46
  const latitude = particle.z
  const fold =
    Math.sin(angle * 2.03 + elapsed * 0.071) * 0.17 +
    Math.cos(latitude * 5.2 - elapsed * 0.093) * 0.11
  const aperture = 0.46 + Math.abs(latitude) * 0.42 + fold
  const pinch = 1 - Math.exp(-Math.abs(latitude) * 4.5) * 0.22

  return {
    x: Math.cos(angle) * aperture * pinch * 1.2,
    y:
      Math.sin(angle) * aperture * 0.62 +
      latitude * 0.36 +
      Math.sin(angle * 3.1) * 0.06,
    depth: Math.sin(angle) * 0.72 + fold,
    energy: Math.abs(fold) * 2.2,
  }
}

function projectFilament(
  particle: Particle,
  index: number,
  count: number,
  elapsed: number,
  yaw: number
): Point {
  const branches = 11
  const branch = index % branches
  const progress = Math.floor(index / branches) / Math.ceil(count / branches)
  const baseAngle = (branch / branches) * TAU + yaw * 0.22
  const fork =
    Math.sin(progress * 8.4 + particle.seed * 5 + elapsed * 0.067) *
    (0.04 + progress * 0.14)
  const angle = baseAngle + fork
  const radius = 0.08 + progress * 1.03
  const pulse = Math.sin(progress * 17 - elapsed * 0.211 + branch) * 0.035

  return {
    x: Math.cos(angle) * radius + Math.cos(angle * 3 + elapsed * 0.09) * pulse,
    y:
      Math.sin(angle) * radius * 0.74 +
      Math.sin(progress * 5.7 + branch * 0.9) * progress * 0.11,
    depth: Math.sin(baseAngle * 1.7 + progress * 4.2 + elapsed * 0.081),
    energy: 1 - progress * 0.55,
  }
}

function projectOrbit(
  _particle: Particle,
  index: number,
  count: number,
  elapsed: number,
  yaw: number
): Point {
  const lane = index % 9
  const position = Math.floor(index / 9) / Math.ceil(count / 9)
  const angle = position * TAU + yaw * (0.24 + lane * 0.013)
  const radius = 0.24 + lane * 0.1
  const precession = Math.sin(elapsed * 0.057 + lane * 0.81) * 0.28
  const wave = Math.sin(angle * 3.07 - elapsed * 0.127 + lane) * 0.055

  return {
    x: Math.cos(angle) * (radius + wave),
    y: Math.sin(angle) * (radius + wave) * (0.38 + lane * 0.035),
    depth: Math.sin(angle + precession),
    energy: 0.3 + Math.abs(Math.sin(angle * 2 + lane)) * 0.7,
  }
}

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    theta: index * GOLDEN_ANGLE,
    z: 1 - (2 * (index + 0.5)) / count,
    seed: fract(Math.sin(index * 91.733) * 43758.5453),
  }))
}

function shuffledFormBag(excluding: number) {
  const bag = CORE_FORMS.map((_, index) => index).filter(
    (index) => index !== excluding
  )

  for (let index = bag.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1))
    ;[bag[index], bag[target]] = [bag[target], bag[index]]
  }

  return bag
}

function drawField(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  elapsed: number,
  morphProgress: number
) {
  context.strokeStyle = '#737b89'
  context.lineWidth = 0.45
  context.globalAlpha = 0.13

  for (let ring = 0; ring < 3; ring += 1) {
    const phase = elapsed * (0.023 + ring * 0.006)
    const distortion = Math.sin(morphProgress * Math.PI) * (ring + 1) * 0.025
    context.beginPath()
    context.ellipse(
      cx,
      cy,
      scale * (0.94 + ring * 0.19 + distortion),
      scale * (0.31 + ring * 0.055 - distortion * 0.4),
      -0.34 + phase,
      0,
      TAU
    )
    context.stroke()
  }

  context.globalAlpha = 0.09
  context.beginPath()
  context.moveTo(cx - scale * 1.28, cy)
  context.lineTo(cx + scale * 1.28, cy)
  context.moveTo(cx, cy - scale * 1.28)
  context.lineTo(cx, cy + scale * 1.28)
  context.stroke()
}

function drawSignalTrace(
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  scale: number,
  elapsed: number,
  currentForm: number,
  nextForm: number
) {
  context.globalAlpha = 0.38
  context.lineWidth = 0.7
  context.strokeStyle = spectralColor(17 + nextForm * 7, elapsed)
  context.beginPath()
  for (let step = 0; step <= 42; step += 1) {
    const angle = (step / 42) * TAU + elapsed * 0.061
    const signature = 3.17 + currentForm * 0.43 + nextForm * 0.19
    const radius =
      scale * (0.78 + Math.sin(angle * signature + elapsed * 0.149) * 0.07)
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius * 0.42
    if (step === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  context.stroke()
}

function mixPoint(from: Point, to: Point, amount: number): Point {
  return {
    x: mix(from.x, to.x, amount),
    y: mix(from.y, to.y, amount),
    depth: mix(from.depth, to.depth, amount),
    energy: mix(from.energy, to.energy, amount),
  }
}

function spectralColor(index: number, elapsed: number) {
  const palette = ['#70e4ee', '#8fa7ff', '#c08cff', '#ea8ccd', '#8bedda']
  const drift = Math.floor(elapsed * 0.37 + Math.sin(elapsed * 0.11) * 2)
  return palette[Math.abs(index + drift) % palette.length]
}

function smootherStep(value: number) {
  return value * value * value * (value * (value * 6 - 15) + 10)
}

function randomBetween(minimum: number, maximum: number) {
  return minimum + Math.random() * (maximum - minimum)
}

function mix(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum)
}

function fract(value: number) {
  return value - Math.floor(value)
}
