export type StatusTone = 'good' | 'warn' | 'danger' | 'muted'

export const shortcuts = {
  palette: { keys: 'Ctrl K', label: 'Open command palette' },
  command: { keys: 'g c', label: 'Go to Command' },
  approvals: { keys: 'g a', label: 'Go to Approvals' },
  system: { keys: 'g s', label: 'Go to System' },
  memory: { keys: 'g m', label: 'Go to Memory' },
  list: { keys: 'j / k', label: 'Move through a list' },
  approve: { keys: 'a', label: 'Approve focused request' },
  reject: { keys: 'r', label: 'Reject focused request' },
} as const

export const statusToTone = (value?: string): StatusTone => {
  const text = String(value || '').toLowerCase()
  if (/error|fail|down|critical|reject|stale/.test(text)) return 'danger'
  if (/pending|warn|degraded|paused|waiting/.test(text)) return 'warn'
  if (/ok|online|running|approved|healthy|active|ready/.test(text)) return 'good'
  return 'muted'
}

export const entityTag = (value?: string) => {
  const text = String(value || '').toLowerCase()
  if (/approval|verification|gate/.test(text)) return 'approval'
  if (/chat|session/.test(text)) return 'chat'
  if (/cron|automation|job/.test(text)) return 'automation'
  if (/memory|entity|skill|episode/.test(text)) return 'memory'
  return 'system'
}

export const formatRelativeTime = (value?: string) => {
  if (!value) return 'unknown'
  const delta = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(delta)) return value
  const minutes = Math.max(1, Math.round(delta / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

export const copyMachineValue = async (value: string) => {
  await navigator.clipboard?.writeText(value)
}
