export type SourceState =
  | 'live'
  | 'degraded'
  | 'offline'
  | 'stale'
  | 'blocked'
  | 'empty'
  | 'planned'
  | 'unknown'

export type SystemSnapshot = {
  vitals?: unknown
  containers?: unknown
  backups?: unknown
}

export type SystemStat = {
  title: 'CPU' | 'Memory' | 'Disk' | 'Backup'
  value: string
  note: string
  state: SourceState
}

export type SystemService = {
  name: string
  status: string
  uptime: string
  cpu: string
  memory: string
}

export type SystemOverview = {
  stats: SystemStat[]
  services: SystemService[]
  serviceState: SourceState
  backupState: SourceState
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasError(value: unknown) {
  return isRecord(value) && typeof value.error !== 'undefined'
}

function numberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function percent(value: unknown) {
  const numeric = numberValue(value)
  return typeof numeric === 'number' ? `${numeric}%` : 'unknown'
}

function statState(value: unknown) {
  return typeof numberValue(value) === 'number' ? 'live' : 'unknown'
}

function sampleNote(detail?: string) {
  return detail ? `${detail} · current sample` : 'current sample'
}

function unknownVitals(): SystemStat[] {
  return [
    {
      title: 'CPU',
      value: 'unknown',
      note: 'SystemGate unavailable',
      state: 'degraded',
    },
    {
      title: 'Memory',
      value: 'unknown',
      note: 'SystemGate unavailable',
      state: 'degraded',
    },
    {
      title: 'Disk',
      value: 'unknown',
      note: 'SystemGate unavailable',
      state: 'degraded',
    },
  ]
}

function buildVitalStats(vitals: unknown): SystemStat[] {
  if (!isRecord(vitals) || hasError(vitals)) return unknownVitals()
  const memory = isRecord(vitals.memory) ? vitals.memory : {}
  const disk = isRecord(vitals.disk) ? vitals.disk : {}
  return [
    {
      title: 'CPU',
      value: percent(vitals.cpu_percent),
      note: sampleNote(
        typeof numberValue(vitals.cpu_count) === 'number'
          ? `${numberValue(vitals.cpu_count)} cores`
          : undefined
      ),
      state: statState(vitals.cpu_percent),
    },
    {
      title: 'Memory',
      value: percent(memory.percent),
      note: sampleNote(),
      state: statState(memory.percent),
    },
    {
      title: 'Disk',
      value: percent(disk.percent),
      note: sampleNote(),
      state: statState(disk.percent),
    },
  ]
}

function backupAge(latest: Record<string, unknown>) {
  const hours = numberValue(latest.age_hours)
  if (typeof hours === 'number') return `${Math.round(hours)}h`
  const minutes = numberValue(latest.age_minutes)
  if (typeof minutes === 'number')
    return minutes < 60
      ? `${Math.round(minutes)}m`
      : `${Math.round(minutes / 60)}h`
  const timestamp =
    latest.created_at ?? latest.updated_at ?? latest.completed_at
  if (typeof timestamp === 'string') return 'timestamped'
  return 'available'
}

function buildBackupStat(backups: unknown): SystemStat {
  if (hasError(backups)) {
    return {
      title: 'Backup',
      value: 'unknown',
      note: 'SystemGate backup source unavailable',
      state: 'degraded',
    }
  }
  const latest =
    isRecord(backups) && isRecord(backups.latest) ? backups.latest : undefined
  if (!latest) {
    return {
      title: 'Backup',
      value: 'unknown',
      note: 'No backup source data',
      state: 'unknown',
    }
  }
  const name =
    typeof latest.name === 'string' && latest.name
      ? latest.name
      : 'latest backup'
  return {
    title: 'Backup',
    value: backupAge(latest),
    note: `${name} · source reported age`,
    state: 'live',
  }
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value
  if (isRecord(value) && Array.isArray(value.results)) return value.results
  if (isRecord(value) && Array.isArray(value.items)) return value.items
  return []
}

function stringField(value: unknown, fallback = 'unknown') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function normalizeServices(containers: unknown): SystemService[] {
  return asArray(containers)
    .filter(isRecord)
    .map((service) => ({
      name: stringField(service.name ?? service.id, 'unnamed service'),
      status: stringField(service.status),
      uptime: stringField(service.uptime, 'not reported'),
      cpu: stringField(service.cpu ?? service.cpu_percent, 'not reported'),
      memory: stringField(
        service.memory ?? service.memory_usage,
        'not reported'
      ),
    }))
}

export function buildSystemOverview(
  system: SystemSnapshot | undefined
): SystemOverview {
  if (!system) {
    return {
      stats: [
        {
          title: 'CPU',
          value: 'unknown',
          note: 'SystemGate not loaded',
          state: 'unknown',
        },
        {
          title: 'Memory',
          value: 'unknown',
          note: 'SystemGate not loaded',
          state: 'unknown',
        },
        {
          title: 'Disk',
          value: 'unknown',
          note: 'SystemGate not loaded',
          state: 'unknown',
        },
        {
          title: 'Backup',
          value: 'unknown',
          note: 'SystemGate not loaded',
          state: 'unknown',
        },
      ],
      services: [],
      serviceState: 'unknown',
      backupState: 'unknown',
    }
  }
  const stats = [
    ...buildVitalStats(system?.vitals),
    buildBackupStat(system?.backups),
  ]
  const services = normalizeServices(system?.containers)
  const serviceState = hasError(system?.containers)
    ? 'degraded'
    : services.length
      ? 'live'
      : 'empty'
  const backupState =
    stats.find((stat) => stat.title === 'Backup')?.state ?? 'unknown'
  return { stats, services, serviceState, backupState }
}
