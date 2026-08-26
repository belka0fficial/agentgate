export type CapabilityItem = {
  id: string
  name: string
  status: string
  source: string
  kind: string
  metadata_only?: boolean
  details_withheld?: boolean
}

export type CapabilitySource = {
  source: string
  status: string
  message?: string
}

export type CapabilitiesResponse = {
  metadata_only?: boolean
  sources?: Record<string, CapabilitySource>
  tools?: CapabilityItem[]
  toolsets?: CapabilityItem[]
  skills?: CapabilityItem[]
  automations?: CapabilityItem[]
  counts?: Record<string, number>
  section_statuses?: Record<string, string>
}

const itemStatuses = new Set([
  'live',
  'degraded',
  'offline',
  'stale',
  'blocked',
  'empty',
  'planned',
  'unknown',
])
const sectionStatuses = itemStatuses

export function normalizeCapabilityItemStatus(status: string | undefined) {
  return status && itemStatuses.has(status) ? status : 'unknown'
}

function normalizeItems(items: CapabilityItem[] | undefined) {
  return (items ?? []).map((item) => ({
    ...item,
    status: normalizeCapabilityItemStatus(item.status),
  }))
}

export function capabilitySections(data: CapabilitiesResponse | undefined) {
  return [
    {
      id: 'tools',
      title: 'Tools',
      source: 'ToolGate',
      status: sectionStatuses.has(data?.section_statuses?.tools ?? '')
        ? (data?.section_statuses?.tools ?? 'unknown')
        : 'unknown',
      items: normalizeItems(data?.tools),
    },
    {
      id: 'toolsets',
      title: 'Toolsets',
      source: 'Runtime',
      status: sectionStatuses.has(data?.section_statuses?.toolsets ?? '')
        ? (data?.section_statuses?.toolsets ?? 'unknown')
        : 'unknown',
      items: normalizeItems(data?.toolsets),
    },
    {
      id: 'skills',
      title: 'Skills',
      source: 'Runtime',
      status: sectionStatuses.has(data?.section_statuses?.skills ?? '')
        ? (data?.section_statuses?.skills ?? 'unknown')
        : 'unknown',
      items: normalizeItems(data?.skills),
    },
    {
      id: 'automations',
      title: 'Automations',
      source: 'ToolGate',
      status: sectionStatuses.has(data?.section_statuses?.automations ?? '')
        ? (data?.section_statuses?.automations ?? 'unknown')
        : 'unknown',
      items: normalizeItems(data?.automations),
    },
  ]
}

export function capabilityStatus(data: CapabilitiesResponse | undefined) {
  if (!data) return 'unknown'
  const statuses = Object.values(data.sources ?? {}).map((item) => item.status)
  if (statuses.some((status) => status === 'blocked')) return 'blocked'
  if (statuses.some((status) => status === 'offline')) return 'offline'
  if (statuses.some((status) => status === 'degraded')) return 'degraded'
  if (statuses.length === 0 || statuses.every((status) => status === 'empty'))
    return 'empty'
  if (statuses.every((status) => status === 'live')) return 'live'
  return 'unknown'
}
