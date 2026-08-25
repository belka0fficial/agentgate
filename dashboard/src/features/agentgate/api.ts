export type Approval = {
  id: string
  source: string
  severity: 'high' | 'medium' | 'low'
  title: string
  details: string
  binding: { type: string; id: string; version: string; digest: string }
  created_at: string
}

export type DecidedApproval = Approval & {
  decision: 'approved' | 'rejected'
  decided_at: string
  decided_by: string
}

export type ChatSession = {
  id: string
  title: string
  preview: string
  updated_at: string
  message_count?: number
  model?: string
  mode?: string
}

const ago = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString()

const pendingApprovals: Approval[] = [
  {
    id: 'appr_01',
    source: 'ToolGate',
    severity: 'high',
    title: 'Publish release notes to public changelog',
    details:
      'Writes the reviewed AgentGate 0.8 notes to the public repository.',
    binding: {
      type: 'repository.write',
      id: 'agentgate/docs/CHANGELOG.md',
      version: '9e4ab21',
      digest: 'sha256:8d18c2e4…4f0e',
    },
    created_at: ago(4),
  },
  {
    id: 'appr_02',
    source: 'Hermes',
    severity: 'medium',
    title: 'Send the infrastructure summary',
    details: 'Delivers the daily summary to the configured owner channel.',
    binding: {
      type: 'message.send',
      id: 'owner:local',
      version: 'draft-6',
      digest: 'sha256:1aae437b…db91',
    },
    created_at: ago(13),
  },
  {
    id: 'appr_03',
    source: 'ToolGate',
    severity: 'medium',
    title: 'Rotate expired workspace token',
    details:
      'Replaces one local integration token with a newly generated value.',
    binding: {
      type: 'credential.rotate',
      id: 'integration:linear',
      version: 'v3',
      digest: 'sha256:696d491c…bf27',
    },
    created_at: ago(22),
  },
  {
    id: 'appr_04',
    source: 'Hermes',
    severity: 'low',
    title: 'Archive resolved research thread',
    details: 'Moves a completed research thread to the project archive.',
    binding: {
      type: 'memory.archive',
      id: 'thread:research-aug-16',
      version: '14',
      digest: 'sha256:2c7ca38f…2b60',
    },
    created_at: ago(47),
  },
]

const decidedApprovals: DecidedApproval[] = [
  {
    ...pendingApprovals[0],
    id: 'appr_91',
    title: 'Write release checklist snapshot',
    decision: 'approved',
    decided_at: ago(74),
    decided_by: 'Owner',
  },
  {
    ...pendingApprovals[1],
    id: 'appr_90',
    title: 'Send unverified deployment estimate',
    decision: 'rejected',
    decided_at: ago(188),
    decided_by: 'Owner',
  },
  {
    ...pendingApprovals[2],
    id: 'appr_89',
    title: 'Refresh scoped repository index',
    decision: 'approved',
    decided_at: ago(402),
    decided_by: 'Owner',
  },
  {
    ...pendingApprovals[3],
    id: 'appr_88',
    title: 'Archive duplicate evidence bundle',
    decision: 'approved',
    decided_at: ago(781),
    decided_by: 'Owner',
  },
]

const sessions: ChatSession[] = [
  [
    'chat_release',
    'Release readiness review',
    'Cross-check the 0.8 release checklist and unresolved risks.',
    2,
  ],
  [
    'chat_memory',
    'Memory retention audit',
    'Map stale memories to their evidence and retention policies.',
    18,
  ],
  [
    'chat_infra',
    'Infrastructure anomaly triage',
    'Disk pressure is stable; review the trend before resizing.',
    42,
  ],
  [
    'chat_research',
    'Research thread: agent trust',
    'Summarize the source set and isolate claims needing citations.',
    75,
  ],
  [
    'chat_tools',
    'Tool permission design',
    'Propose a narrow policy for repository and messaging access.',
    133,
  ],
  [
    'chat_voice',
    'Voice and character direction',
    'Keep the assistant direct, observant, and calm under pressure.',
    226,
  ],
  [
    'chat_automations',
    'Automation backlog',
    'Rank daily jobs by value, blast radius, and verification cost.',
    376,
  ],
  [
    'chat_incident',
    'Incident rehearsal notes',
    'Draft a contained response plan for a failed external delivery.',
    584,
  ],
  [
    'chat_archive',
    'July knowledge archive',
    'Find duplicated working notes before the monthly export.',
    1_040,
  ],
].map(([id, title, preview, minutes], index) => ({
  id: String(id),
  title: String(title),
  preview: String(preview),
  updated_at: ago(minutes as number),
  message_count: [6, 18, 31, 44, 12, 23, 17, 38, 91][index],
  model: index % 3 === 1 ? 'gpt-5.2-mini' : 'gpt-5.2',
  mode: index % 4 === 2 ? 'deep search' : 'operator',
}))

const suggestions = [
  {
    title: 'Set a disk growth threshold for the release window',
    summary:
      'Turn the observed storage trend into a verified alert before the next build.',
    theme: 'System resilience',
    priority: 'high',
    confidence: 94,
  },
  {
    title: 'Schedule an incident delivery rehearsal',
    summary:
      'Practice a contained failure response before any real external handoff.',
    theme: 'System resilience',
    priority: 'medium',
    confidence: 81,
  },
  {
    title: 'Bundle daily automation results into one owner briefing',
    summary:
      'Reduce review overhead without widening any automation permissions.',
    theme: 'Operator workflow',
    priority: 'medium',
    confidence: 89,
  },
  {
    title: 'Narrow the weekly repository policy',
    summary: 'Keep the maintenance automation inside its reviewed file scope.',
    theme: 'Operator workflow',
    priority: 'high',
    confidence: 92,
  },
  {
    title: 'Attach evidence to the trust research claims',
    summary: 'Three conclusions still lack a source link in the draft.',
    theme: 'Knowledge quality',
    priority: 'high',
    confidence: 97,
  },
  {
    title: 'Review the stale source connectors',
    summary:
      'Two research feeds have not delivered evidence during the expected interval.',
    theme: 'Knowledge quality',
    priority: 'low',
    confidence: 76,
  },
]

export type ToolTrace = {
  tool: string
  args: string
  duration_ms: number
  result: string
}

export type ChatMessage = {
  id: string
  role: 'owner' | 'agent'
  content: string
  created_at: string
  trace?: ToolTrace[]
}

const chatMessages: ChatMessage[] = [
  {
    id: 'msg_01',
    role: 'owner',
    content: 'Cross-check the 0.8 release checklist and unresolved risks.',
    created_at: ago(28),
  },
  {
    id: 'msg_02',
    role: 'agent',
    content:
      'The release is structurally ready. Four owner decisions remain: the changelog publication, infrastructure summary, token rotation, and research-thread archive.',
    created_at: ago(25),
    trace: [
      {
        tool: 'memory.search',
        args: 'query="release 0.8 checklist" limit=8',
        duration_ms: 84,
        result: '6 memories, 4 with direct evidence',
      },
      {
        tool: 'toolgate.list_approvals',
        args: 'status=pending scope=release',
        duration_ms: 126,
        result: '4 bound actions returned',
      },
    ],
  },
  {
    id: 'msg_03',
    role: 'owner',
    content: 'Which one blocks the public release?',
    created_at: ago(20),
  },
  {
    id: 'msg_04',
    role: 'agent',
    content:
      'Only the changelog publication is release-facing. Its file binding and digest are available in Approvals for review.',
    created_at: ago(18),
    trace: [
      {
        tool: 'policy.evaluate',
        args: 'action=repository.write target=docs/CHANGELOG.md',
        duration_ms: 41,
        result: 'owner approval required',
      },
    ],
  },
  {
    id: 'msg_05',
    role: 'owner',
    content:
      'Prepare the final readiness summary, but do not publish anything.',
    created_at: ago(12),
  },
  {
    id: 'msg_06',
    role: 'agent',
    content:
      'Prepared. I will retain the summary locally until you explicitly approve the bound publication action.',
    created_at: ago(8),
    trace: [
      {
        tool: 'artifact.write',
        args: 'path=.agentgate/drafts/release-readiness.md visibility=local',
        duration_ms: 62,
        result: 'draft written · 2.8 KB · no external effect',
      },
    ],
  },
]

const automations = [
  {
    id: 'auto_brief',
    name: 'Daily owner briefing',
    description:
      'Collect verified system changes into one owner-ready summary.',
    schedule: '0 8 * * 1-5',
    next: 'in 16h',
    status: 'active',
    runs: 82,
    last_status: 'success',
    last_run: '18m ago',
    output: '12 verified changes · 3 owner notes',
    history: 'sssssssfssss',
  },
  {
    id: 'auto_backup',
    name: 'Backup verification',
    description: 'Validate the newest encrypted archive and retention pointer.',
    schedule: '15 6 * * *',
    next: 'in 14h',
    status: 'active',
    runs: 103,
    last_status: 'failed',
    last_run: '1d ago',
    output: 'Archive is 31h old · retry queued',
    history: 'sssssssssfsf',
  },
  {
    id: 'auto_memory',
    name: 'Memory evidence scan',
    description: 'Flag durable notes without linked source evidence.',
    schedule: '0 */6 * * *',
    next: 'in 2h',
    status: 'active',
    runs: 341,
    last_status: 'success',
    last_run: '4h ago',
    output: '14 checked · 3 missing evidence',
    history: 'ssssssssssss',
  },
  {
    id: 'auto_policy',
    name: 'Permission drift review',
    description: 'Compare active tool policy against the reviewed baseline.',
    schedule: '30 9 * * 1',
    next: 'in 1d',
    status: 'paused',
    runs: 18,
    last_status: 'success',
    last_run: '6d ago',
    output: 'No privilege drift detected',
    history: 'sssssfssssss',
  },
  {
    id: 'auto_release',
    name: 'Release checklist watcher',
    description: 'Report unresolved release gates without taking action.',
    schedule: '0 */2 * * *',
    next: 'in 43m',
    status: 'active',
    runs: 64,
    last_status: 'success',
    last_run: '77m ago',
    output: '1 blocking gate · 3 advisory',
    history: 'ssssssssssfs',
  },
  {
    id: 'auto_archive',
    name: 'Research archive digest',
    description: 'Prepare a monthly archive candidate list for review.',
    schedule: '0 10 1 * *',
    next: 'in 15d',
    status: 'draft',
    runs: 0,
    last_status: 'never',
    last_run: '—',
    output: 'No runs yet',
    history: '------------',
  },
]

const memories = [
  [
    'mem_001',
    'Release policy: public notes require a bound approval',
    'policy',
    'high',
    5,
  ],
  [
    'mem_002',
    'Owner prefers concise, evidence-linked daily briefings',
    'preference',
    'high',
    16,
  ],
  [
    'mem_003',
    'Infrastructure disk alert threshold is 78 percent',
    'operational',
    'high',
    32,
  ],
  [
    'mem_004',
    'Linear integration token rotated on August 02',
    'credential-event',
    'medium',
    94,
  ],
  [
    'mem_005',
    'Agent trust research claim set needs three citations',
    'research',
    'medium',
    128,
  ],
  [
    'mem_006',
    'Release 0.8 verification checklist is active',
    'project',
    'high',
    181,
  ],
  [
    'mem_007',
    'Incident rehearsal uses contained delivery failure scenario',
    'runbook',
    'medium',
    239,
  ],
  [
    'mem_008',
    'Repository writes remain scoped to reviewed paths',
    'policy',
    'high',
    317,
  ],
  [
    'mem_009',
    'Morning backup is stored under the encrypted archive policy',
    'operational',
    'medium',
    419,
  ],
  [
    'mem_010',
    'Character voice: direct, observant, calm under pressure',
    'character',
    'high',
    522,
  ],
  [
    'mem_011',
    'Automation jobs never widen their own permission scope',
    'policy',
    'high',
    711,
  ],
  [
    'mem_012',
    'Research archive export is reviewed monthly',
    'retention',
    'low',
    885,
  ],
  [
    'mem_013',
    'Owner channel is local until an external endpoint is bound',
    'integration',
    'medium',
    1062,
  ],
  [
    'mem_014',
    'Use evidence links for any recommendation with external impact',
    'policy',
    'high',
    1394,
  ],
].map(([id, title, kind, confidence, minutes]) => ({
  id,
  title,
  kind,
  confidence,
  updated_at: ago(minutes as number),
}))

const character = {
  name: 'Hermes',
  role: 'A careful operator for a privately owned agent system.',
  voice:
    'Direct, observant, and calm under pressure. State evidence before recommendations. Never imply an action has happened when it has only been proposed.',
  operating_principle:
    'Prefer narrow, reviewable actions. Escalate when an external effect, privilege change, or irreversible step requires owner approval.',
}

const homeFixture = {
  health: {
    hermes: { status: 'ok' },
    toolgate: { status: 'ok' },
    memorygate: { status: 'ok' },
  },
  pending_verifications: pendingApprovals,
  suggestions,
  anomalies: [
    {
      label: 'Backup stale',
      detail: '31h since verified archive',
      severity: 'warning',
    },
    {
      label: 'Indexer down',
      detail: 'research-source-2 unreachable',
      severity: 'critical',
    },
    {
      label: 'Disk projection',
      detail: '86% in 9 days at current rate',
      severity: 'warning',
    },
  ],
  activity: [
    'Approval binding created · 4m',
    'Morning briefing assembled · 18m',
    'Memory evidence scan finished · 22m',
    'Backup verification flagged stale · 31m',
    'Release watcher completed · 77m',
  ],
  pinned_apps: [
    { id: 'runbook', name: 'Runbook', url: 'https://example.invalid/runbook' },
    { id: 'trace', name: 'Trace view', url: 'https://example.invalid/trace' },
    { id: 'memory', name: 'Memory map', url: 'https://example.invalid/memory' },
  ],
}

const systemFixture = {
  vitals: {
    cpu_percent: 27,
    memory: { percent: 46 },
    disk: { percent: 63 },
    cpu_count: 12,
  },
  backups: { latest: { name: 'agentgate-2026-08-16-0600.zst' } },
  containers: [
    {
      name: 'hermes-core',
      status: 'healthy',
      uptime: '12d 4h',
      cpu: '8.2%',
      memory: '742 MB',
    },
    {
      name: 'toolgate',
      status: 'healthy',
      uptime: '12d 4h',
      cpu: '2.7%',
      memory: '184 MB',
    },
    {
      name: 'memorygate',
      status: 'healthy',
      uptime: '12d 4h',
      cpu: '4.1%',
      memory: '392 MB',
    },
    {
      name: 'event-router',
      status: 'healthy',
      uptime: '12d 4h',
      cpu: '1.6%',
      memory: '96 MB',
    },
    {
      name: 'backup-worker',
      status: 'idle',
      uptime: '12d 4h',
      cpu: '0.3%',
      memory: '71 MB',
    },
  ],
  errors: [
    {
      at: '10:42:18',
      service: 'research-indexer',
      level: 'error',
      message: 'source-2 connection refused after 3 retries',
    },
    {
      at: '10:39:04',
      service: 'backup-worker',
      level: 'warn',
      message: 'verified archive age exceeded 24h policy',
    },
    {
      at: '09:58:31',
      service: 'event-router',
      level: 'warn',
      message: 'delivery latency p95 crossed 850ms',
    },
  ],
  packages: [
    {
      name: 'hermes-core',
      current: '0.8.0-rc.4',
      latest: '0.8.0-rc.4',
      state: 'current',
    },
    {
      name: 'toolgate-policy',
      current: '1.14.2',
      latest: '1.14.3',
      state: 'patch available',
    },
    { name: 'memorygate', current: '0.6.8', latest: '0.6.8', state: 'current' },
    {
      name: 'event-router',
      current: '2.3.1',
      latest: '2.4.0',
      state: 'minor available',
    },
  ],
}

const fixtures: Record<string, unknown> = {
  '/api/home': homeFixture,
  '/api/system': systemFixture,
  '/api/approvals': pendingApprovals,
  '/api/approvals/history': decidedApprovals,
  '/api/chats': { sessions },
  '/api/automations': { automations },
  '/api/gates/memorygate': { memories },
  '/api/suggestions': { suggestions },
  '/api/character': character,
}

export async function getAgentGate<T>(path: string): Promise<T> {
  if (import.meta.env.VITE_AGENTGATE_FIXTURES !== '0') {
    if (fixtures[path] !== undefined) return fixtures[path] as T
    if (/^\/api\/chats\/[^/]+\/messages$/.test(path))
      return { messages: chatMessages } as T
  }
  const response = await fetch(path, { credentials: 'same-origin' })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export async function postAgentGate<T>(
  path: string,
  body?: unknown
): Promise<T> {
  if (import.meta.env.VITE_AGENTGATE_FIXTURES !== '0')
    return { id: 'chat_release', ok: true } as T
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`Request failed: ${response.status}`)
  return response.json() as Promise<T>
}

export const relativeTime = (value: string) => {
  const minutes = Math.max(
    1,
    Math.round((Date.now() - new Date(value).getTime()) / 60_000)
  )
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 2880) return `${Math.round(minutes / 60)}h ago`
  return `${Math.round(minutes / 1440)}d ago`
}
