export type Approval = {
  id: string
  source: string
  severity: 'high' | 'medium' | 'low'
  title: string
  details: string
  binding: { type: string; id: string; version: string; digest: string }
  created_at: string
}

export type ChatSession = {
  id: string
  title: string
  preview: string
  updated_at: string
}

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString()

const pendingApprovals: Approval[] = [
  { id: 'appr_01', source: 'ToolGate', severity: 'high', title: 'Publish release notes to public changelog', details: 'Writes the reviewed AgentGate 0.8 notes to the public repository.', binding: { type: 'repository.write', id: 'agentgate/docs/CHANGELOG.md', version: '9e4ab21', digest: 'sha256:8d18c2e4…4f0e' }, created_at: ago(4) },
  { id: 'appr_02', source: 'Hermes', severity: 'medium', title: 'Send the infrastructure summary', details: 'Delivers the daily summary to the configured owner channel.', binding: { type: 'message.send', id: 'owner:local', version: 'draft-6', digest: 'sha256:1aae437b…db91' }, created_at: ago(13) },
  { id: 'appr_03', source: 'ToolGate', severity: 'medium', title: 'Rotate expired workspace token', details: 'Replaces one local integration token with a newly generated value.', binding: { type: 'credential.rotate', id: 'integration:linear', version: 'v3', digest: 'sha256:696d491c…bf27' }, created_at: ago(22) },
  { id: 'appr_04', source: 'Hermes', severity: 'low', title: 'Archive resolved research thread', details: 'Moves a completed research thread to the project archive.', binding: { type: 'memory.archive', id: 'thread:research-aug-16', version: '14', digest: 'sha256:2c7ca38f…2b60' }, created_at: ago(47) },
]

const sessions: ChatSession[] = [
  ['chat_release', 'Release readiness review', 'Cross-check the 0.8 release checklist and unresolved risks.', 2],
  ['chat_memory', 'Memory retention audit', 'Map stale memories to their evidence and retention policies.', 18],
  ['chat_infra', 'Infrastructure anomaly triage', 'Disk pressure is stable; review the trend before resizing.', 42],
  ['chat_research', 'Research thread: agent trust', 'Summarize the source set and isolate claims needing citations.', 75],
  ['chat_tools', 'Tool permission design', 'Propose a narrow policy for repository and messaging access.', 133],
  ['chat_voice', 'Voice and character direction', 'Keep the assistant direct, observant, and calm under pressure.', 226],
  ['chat_automations', 'Automation backlog', 'Rank daily jobs by value, blast radius, and verification cost.', 376],
  ['chat_incident', 'Incident rehearsal notes', 'Draft a contained response plan for a failed external delivery.', 584],
  ['chat_archive', 'July knowledge archive', 'Find duplicated working notes before the monthly export.', 1_040],
].map(([id, title, preview, minutes]) => ({ id: String(id), title: String(title), preview: String(preview), updated_at: ago(minutes as number) }))

const suggestions = [
  { title: 'Set a disk growth threshold for the release window', summary: 'Turn the observed storage trend into a verified alert before the next build.' },
  { title: 'Bundle daily automation results into one owner briefing', summary: 'Reduce review overhead without widening any automation permissions.' },
  { title: 'Attach evidence to the trust research claims', summary: 'Three conclusions still lack a source link in the draft.' },
  { title: 'Schedule an incident delivery rehearsal', summary: 'Practice a contained failure response before any real external handoff.' },
]

const homeFixture = {
  health: { hermes: { status: 'ok' }, toolgate: { status: 'ok' }, memorygate: { status: 'ok' } },
  pending_verifications: pendingApprovals,
  suggestions,
  pinned_apps: [
    { id: 'runbook', name: 'Runbook', url: 'https://example.invalid/runbook' },
    { id: 'trace', name: 'Trace view', url: 'https://example.invalid/trace' },
    { id: 'memory', name: 'Memory map', url: 'https://example.invalid/memory' },
  ],
}

const systemFixture = {
  vitals: { cpu_percent: 27, memory: { percent: 46 }, disk: { percent: 63 }, cpu_count: 12 },
  backups: { latest: { name: 'agentgate-2026-08-16-0600.zst' } },
}

const fixtures: Record<string, unknown> = {
  '/api/home': homeFixture,
  '/api/system': systemFixture,
  '/api/approvals': pendingApprovals,
  '/api/chats': { sessions },
}

export async function getAgentGate<T>(path: string): Promise<T> {
  if (import.meta.env.DEV && import.meta.env.VITE_AGENTGATE_FIXTURES !== '0' && fixtures[path] !== undefined) return fixtures[path] as T
  const response = await fetch(path, { credentials: 'same-origin' })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export async function postAgentGate<T>(path: string, body?: unknown): Promise<T> {
  if (import.meta.env.DEV && import.meta.env.VITE_AGENTGATE_FIXTURES !== '0') return { id: 'chat_release', ok: true } as T
  const response = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export const relativeTime = (value: string) => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 2880) return `${Math.round(minutes / 60)}h ago`
  return `${Math.round(minutes / 1440)}d ago`
}
