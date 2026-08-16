type Fixture = Record<string, unknown>

const now = new Date()
const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()

const approvals = [
  { id: 'appr_01', source_id: 'verify_2401', source: 'toolgate', status: 'pending', severity: 'high', title: 'Publish release notes to public changelog', details: 'Writes the reviewed AgentGate 0.8 notes to the public repository.', action: { subject_type: 'repository.write', subject_id: 'agentgate/docs/CHANGELOG.md', subject_version: '9e4ab21', binding: { args_digest: 'sha256:8d18c2e4…4f0e' } }, created_at: ago(4) },
  { id: 'appr_02', source_id: 'verify_2402', source: 'hermes', status: 'pending', severity: 'medium', title: 'Send the infrastructure summary', details: 'Delivers the daily summary to the configured owner channel.', action: { subject_type: 'message.send', subject_id: 'owner:local', subject_version: 'draft-6', binding: { args_digest: 'sha256:1aae437b…db91' } }, created_at: ago(13) },
  { id: 'appr_03', source_id: 'verify_2403', source: 'toolgate', status: 'pending', severity: 'medium', title: 'Rotate expired workspace token', details: 'Replaces one local integration token with a newly generated value.', action: { subject_type: 'credential.rotate', subject_id: 'integration:linear', subject_version: 'v3', binding: { args_digest: 'sha256:696d491c…bf27' } }, created_at: ago(22) },
  { id: 'appr_04', source_id: 'verify_2404', source: 'hermes', status: 'pending', severity: 'low', title: 'Archive resolved research thread', details: 'Moves a completed research thread to the project archive.', action: { subject_type: 'memory.archive', subject_id: 'thread:research-aug-16', subject_version: '14', binding: { args_digest: 'sha256:2c7ca38f…2b60' } }, created_at: ago(47) },
  { id: 'appr_05', source_id: 'verify_2398', source: 'toolgate', status: 'approved', severity: 'low', title: 'Update local dependency inventory', details: 'Inventory written to the protected workspace.', actor: 'owner', updated_at: ago(124) },
  { id: 'appr_06', source_id: 'verify_2396', source: 'hermes', status: 'rejected', severity: 'medium', title: 'Invite an external reviewer', details: 'External review requires an explicit owner decision.', actor: 'owner', updated_at: ago(210) },
]

const sessions = [
  ['chat_release', 'Release readiness review', 'Cross-check the 0.8 release checklist and unresolved risks.', 2],
  ['chat_memory', 'Memory retention audit', 'Map stale memories to their evidence and retention policies.', 18],
  ['chat_infra', 'Infrastructure anomaly triage', 'Disk pressure is stable; review the trend before resizing.', 42],
  ['chat_research', 'Research thread: agent trust', 'Summarize the source set and isolate claims needing citations.', 75],
  ['chat_tools', 'Tool permission design', 'Propose a narrow policy for repository and messaging access.', 133],
  ['chat_voice', 'Voice and character direction', 'Keep the assistant direct, observant, and calm under pressure.', 226],
  ['chat_automations', 'Automation backlog', 'Rank daily jobs by value, blast radius, and verification cost.', 376],
  ['chat_incident', 'Incident rehearsal notes', 'Draft a contained response plan for a failed external delivery.', 584],
  ['chat_archive', 'July knowledge archive', 'Find duplicated working notes before the monthly export.', 1_040],
]

const chats = sessions.map(([id, title, preview, minutes]) => ({ id, title, preview, updated_at: ago(minutes as number), created_at: ago((minutes as number) + 55) }))

const messages = [
  { id: 'm01', role: 'user', content: 'Review the release readiness picture. What is actually blocked?' },
  { id: 'm02', role: 'assistant', content: 'Four actions need owner approval. The release notes publication is the highest-impact item; the other three are scoped operational changes.', trace: { sources: ['approvals', 'system'], confidence: 0.94 } },
  { id: 'm03', role: 'user', content: 'Is the host healthy enough to ship today?' },
  { id: 'm04', role: 'assistant', content: 'Yes. CPU and memory are within their ordinary range, the latest backup is present, and the only watch item is disk growth. It is not above the intervention threshold.', trace: { sources: ['system.vitals', 'backups'], confidence: 0.91 } },
  { id: 'm05', role: 'user', content: 'What should I review first?' },
  { id: 'm06', role: 'assistant', content: 'Approve or reject the changelog publication after checking the bound revision. Then decide the token rotation. That keeps external effects explicit and clears the highest-value queue.' },
]

const system = {
  vitals: { cpu_percent: 27, cpu_count: 12, memory: { percent: 46, available: '15.8 GB' }, disk: { percent: 63, free: '428 GB' } },
  containers: { results: [
    { id: 'a4f81d2', name: 'hermes', image: 'agentgate/hermes:0.8.0', status: 'running' },
    { id: 'bd9100e', name: 'toolgate', image: 'agentgate/toolgate:0.8.0', status: 'running' },
    { id: 'cf01ac8', name: 'memorygate', image: 'agentgate/memorygate:0.8.0', status: 'running' },
    { id: 'd8716ae', name: 'postgres', image: 'postgres:16-alpine', status: 'running' },
    { id: 'f5b344a', name: 'vector-index', image: 'qdrant/qdrant:v1.12', status: 'running' },
  ] },
  backups: { latest: { name: 'agentgate-2026-08-16-0600.zst', path: '/srv/backups/agentgate-2026-08-16-0600.zst' } },
}

const suggestions = [
  { id: 'sug_01', status: 'open', title: 'Set a disk growth threshold for the release window', summary: 'Turn the observed storage trend into a verified alert before the next build.', category: 'system', confidence: '0.88', urgency: 'high' },
  { id: 'sug_02', status: 'open', title: 'Bundle daily automation results into one owner briefing', summary: 'Reduce review overhead without widening any automation permissions.', category: 'workflow', confidence: '0.83', urgency: 'normal' },
  { id: 'sug_03', status: 'open', title: 'Attach evidence to the trust research claims', summary: 'Three conclusions still lack a source link in the draft.', category: 'research', confidence: '0.79', urgency: 'normal' },
  { id: 'sug_04', status: 'saved', title: 'Promote permission design notes to a durable policy', summary: 'The pattern has been repeated across four recent sessions.', category: 'memory', confidence: '0.76', urgency: 'low' },
  { id: 'sug_05', status: 'open', title: 'Schedule an incident delivery rehearsal', summary: 'Practice a contained failure response before any real external handoff.', category: 'safety', confidence: '0.72', urgency: 'normal' },
  { id: 'sug_06', status: 'dismissed', title: 'Add a second outbound channel', summary: 'Deferred until the primary summary route is trusted.', category: 'delivery', confidence: '0.61', urgency: 'low' },
]

const memories = [
  ['mem_001', 'owner_preference', 'Owner prefers a direct summary first, then supporting evidence and reversible next steps.'],
  ['mem_002', 'policy', 'No external write, message, or permission escalation proceeds without an approval binding.'],
  ['mem_003', 'project', 'AgentGate 0.8 uses a frozen backend contract during the UI overhaul.'],
  ['mem_004', 'skill', 'Release reviews should enumerate blockers, scope, evidence, and owner action.'],
  ['mem_005', 'entity', 'Hermes is the primary conversational agent and has no autonomous external-send permission.'],
  ['mem_006', 'episode', 'The July archive review found duplicates in unstructured research notes.'],
  ['mem_007', 'system', 'ToolGate is healthy when policy hashes match the mounted configuration revision.'],
  ['mem_008', 'research', 'Trust claims need a source chain, confidence marker, and explicit uncertainty.'],
  ['mem_009', 'workflow', 'Daily system briefings are produced locally at 08:30 and require owner review for delivery.'],
  ['mem_010', 'character', 'The assistant should sound calm, scientifically observant, and never theatrical about risk.'],
  ['mem_011', 'incident', 'External delivery failures are contained locally; retry only after reviewing the exact target.'],
  ['mem_012', 'automation', 'Automations may prepare drafts but cannot expand their permissions by composing other tools.'],
  ['mem_013', 'project', 'The static Core is a status locus, not a decorative replacement for application structure.'],
  ['mem_014', 'owner_preference', 'Machine identifiers and hashes should remain copyable and visually distinct from prose.'],
].map(([id, kind, content]) => ({ id, kind, title: String(kind).replace('_', ' '), content, source: 'MemoryGate', source_chain: { captured_by: 'hermes', verified_at: ago(90) } }))

const automations = {
  jobs: [
    { id: 'cron_01', name: 'Morning systems briefing', prompt: 'Summarize health, approvals, and anomalies for the owner.', schedule: '30 8 * * 1-5', last_run_at: ago(132), next_run_at: '2026-08-17T08:30:00.000Z', status: 'running' },
    { id: 'cron_02', name: 'Memory evidence sweep', prompt: 'Find memories that lack evidence or retention metadata.', schedule: '0 11 * * 2,5', last_run_at: ago(1_382), next_run_at: '2026-08-18T11:00:00.000Z', status: 'running' },
    { id: 'cron_03', name: 'Release risk digest', prompt: 'Prepare a concise review of active delivery risks.', schedule: '15 16 * * 1-5', last_run_at: ago(1_514), next_run_at: '2026-08-16T16:15:00.000Z', status: 'running' },
    { id: 'cron_04', name: 'Archive hygiene scan', prompt: 'Detect duplicated notes and obsolete draft material.', schedule: '0 3 * * 0', last_run_at: ago(8_060), next_run_at: '2026-08-23T03:00:00.000Z', status: 'paused', paused: true },
  ],
  toolgate_automations: [
    { id: 'tg_01', name: 'Dependency inventory', description: 'Record local dependency changes for the next review.', schedule: '0 */6 * * *', last_run: ago(216), next_run: '2026-08-16T12:00:00.000Z', status: 'running' },
    { id: 'tg_02', name: 'Backup verification', description: 'Validate the latest encrypted archive before reporting success.', schedule: '20 6 * * *', last_run: ago(262), next_run: '2026-08-17T06:20:00.000Z', status: 'running' },
  ],
}

const home: Fixture = {
  health: { hermes: { status: 'ok' }, toolgate: { status: 'ok' }, memorygate: { status: 'ok' } },
  pending_verifications: approvals.filter((item) => item.status === 'pending'),
  suggestions: suggestions.filter((item) => item.status === 'open'),
  pinned_apps: [
    { id: 'pin_01', name: 'Runbook', url: 'https://example.invalid/runbook' },
    { id: 'pin_02', name: 'Trace view', url: 'https://example.invalid/trace' },
    { id: 'pin_03', name: 'Memory map', url: 'https://example.invalid/memory' },
  ],
}

const character = { name: 'Hermes', owner_name: 'Owner', avatar_url: '', personality: 'Calm, exacting, and quietly curious.', speaking_style: 'Lead with outcomes, then explain the evidence.', boundaries: 'Never imply approval or act outside explicit bindings.', response_length: 'detailed', context_preview: 'Hermes is a local agent. It exposes uncertainty and waits at explicit approval boundaries.' }

export function fixtureResponse(path: string, method: string): unknown | undefined {
  if (method === 'GET') {
    if (path === '/api/auth/session') return { authenticated: true, fixture: true }
    if (path === '/api/home') return home
    if (path === '/api/system') return system
    if (path === '/api/approvals') return approvals
    if (path === '/api/chats') return { sessions: chats }
    if (path === '/api/suggestions') return suggestions
    if (path === '/api/automations') return automations
    if (path === '/api/gates/memorygate') return { memories, briefing: { active_memories: memories.length, evidence_gaps: 2, policy_revision: 'memory-policy-2026.08' } }
    if (path === '/api/character') return character
    if (/^\/api\/chats\/[^/]+\/messages$/.test(path)) return { messages }
  }
  if (method !== 'GET') {
    if (path === '/api/chats') return { id: 'chat_release' }
    if (/\/fork$/.test(path)) return { id: 'chat_release' }
    if (path === '/api/gates/memorygate/search') return { items: memories.slice(0, 10) }
    return { ok: true, fixture: true }
  }
  return undefined
}
