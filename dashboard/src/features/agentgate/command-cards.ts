export type CommandSystemSnapshot = {
  vitals?: {
    cpu_percent?: number
    memory?: { percent?: number }
    disk?: { percent?: number }
    cpu_count?: number
  }
}

export type CommandStatCard = {
  title: 'CPU' | 'Memory' | 'Disk'
  value: string
  note: string
}

function percent(value: number | undefined) {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${value}%`
    : 'unknown'
}

function sampleNote(detail?: string) {
  return detail ? `${detail} · current sample` : 'current sample'
}

export function buildCommandStatCards(
  system: CommandSystemSnapshot | undefined
): CommandStatCard[] {
  const vitals = system?.vitals
  if (!vitals) {
    return [
      { title: 'CPU', value: 'unknown', note: 'SystemGate unavailable' },
      { title: 'Memory', value: 'unknown', note: 'SystemGate unavailable' },
      { title: 'Disk', value: 'unknown', note: 'SystemGate unavailable' },
    ]
  }

  return [
    {
      title: 'CPU',
      value: percent(vitals.cpu_percent),
      note: sampleNote(
        typeof vitals.cpu_count === 'number'
          ? `${vitals.cpu_count} cores`
          : undefined
      ),
    },
    {
      title: 'Memory',
      value: percent(vitals.memory?.percent),
      note: sampleNote(),
    },
    {
      title: 'Disk',
      value: percent(vitals.disk?.percent),
      note: sampleNote(),
    },
  ]
}
