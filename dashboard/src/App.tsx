import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, Bot, Brain, Check, ChevronRight, Clock3, Command as CommandIcon, Copy, ExternalLink, Gauge, HeartPulse, History, Lightbulb, LogOut, Menu, MessageSquare, Plus, RefreshCw, Search, Send, ShieldCheck, Square, Trash2, Volume2, Wrench, X } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { Toaster, toast } from 'sonner'

import { api, csrfHeaders } from './api'
import { Core } from './components/Core'
import { Button, Card, Empty, ErrorBox, Page, Status } from './components/ui-primitives'
import { agentBus, useAgentBus } from './event-bus'
import type { CoreState } from './event-bus'
import { useLoad } from './hooks/use-load'

type Any = Record<string, any>

const nav = [
  { to: '/', label: 'Command', icon: Gauge, hint: 'live overview' },
  { to: '/approvals', label: 'Approvals', icon: ShieldCheck, hint: 'waiting for you' },
  { to: '/chats', label: 'Chats', icon: MessageSquare, hint: 'sessions' },
  { to: '/system', label: 'System', icon: HeartPulse, hint: 'host telemetry' },
  { to: '/automations', label: 'Automations', icon: Clock3, hint: 'runs alone' },
  { to: '/memory', label: 'Memory', icon: Brain, hint: 'beliefs and skills' },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb, hint: 'possible next moves' },
]

const routeMeta = [
  { match: '/settings/character', label: 'Character', kicker: 'Settings' },
  { match: '/approvals', label: 'Approvals', kicker: 'Safety' },
  { match: '/chats', label: 'Chats', kicker: 'Conversation' },
  { match: '/system', label: 'System', kicker: 'Telemetry' },
  { match: '/automations', label: 'Automations', kicker: 'Schedule' },
  { match: '/memory', label: 'Memory', kicker: 'Context' },
  { match: '/suggestions', label: 'Suggestions', kicker: 'Ideas' },
  { match: '/', label: 'Command', kicker: 'Live' },
]

function machine(value: ReactNode, className = '') {
  return <code className={className}>{value}</code>
}

function humanDate(value?: string) {
  if (!value) return 'unknown'
  const delta = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(delta)) return value
  const minutes = Math.max(1, Math.round(delta / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function statusTone(value?: string) {
  const text = String(value || '').toLowerCase()
  if (/error|fail|down|critical|reject|stale/.test(text)) return 'danger'
  if (/pending|warn|degraded|paused|waiting/.test(text)) return 'warn'
  if (/ok|online|running|approved|healthy|active|ready/.test(text)) return 'good'
  return 'muted'
}

function bindingOf(item: Any) {
  const action = item.action || item.summary?.action || {}
  const binding = action.binding || item.binding || {}
  return {
    type: action.subject_type || action.object_type || item.object_type || 'unknown',
    id: action.subject_id || action.object_id || item.object_id || item.source_id || item.id || 'unknown',
    version: action.subject_version || action.version || item.version || 'n/a',
    digest: binding.args_digest || binding.argument_digest || item.argument_digest || 'missing',
  }
}

function MiniDatum({ label, value, tone }: { label: string, value: ReactNode, tone?: string }) {
  return <span className="mini-datum"><span>{label}</span>{tone ? <Status text={String(value)} tone={tone} /> : machine(value)}</span>
}

function Shell() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const bus = useAgentBus()
  const summary = useLoad<Any>('/api/home')
  const pendingCount = Number(summary.data?.pending_verifications?.length || 0)
  const systemsOnline = ['hermes', 'toolgate', 'memorygate'].filter((name) => !summary.data?.health?.[name]?.error).length
  const current = routeMeta.find((item) => item.match !== '/' ? pathname.startsWith(item.match) : pathname === '/') || routeMeta[routeMeta.length - 1]

  useEffect(() => {
    if (pendingCount > 0 && bus.coreState !== 'thinking' && bus.coreState !== 'speaking' && bus.coreState !== 'executing') agentBus.setCoreState('blocked', 0.45)
    if (pendingCount === 0 && bus.coreState === 'blocked') agentBus.setCoreState('idle', 0.18)
  }, [bus.coreState, pendingCount])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        navigate('/')
        window.dispatchEvent(new CustomEvent('agentgate:focus-omnibar'))
        agentBus.emit({ type: 'chat', label: 'omnibar focused', source: 'keyboard' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  const sidebar = <Sidebar close={() => setOpen(false)} summary={summary.data || undefined} systemsOnline={systemsOnline} />

  return <div className="shell">
    {sidebar}
    <button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={18} /></button>
    {open && <div className="drawer-wrap"><div className="backdrop" onClick={() => setOpen(false)} />{sidebar}<button className="drawer-close" onClick={() => setOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>}
    <main>
      <div className="topbar">
        <div className="topbar-breadcrumb"><span>{current.kicker}</span><ChevronRight size={13} />{machine(current.label)}</div>
        <div className="topbar-core"><Core state={bus.coreState} intensity={bus.intensity} size="mini" /><Status text={systemsOnline === 3 ? 'online' : 'degraded'} tone={systemsOnline === 3 ? 'good' : 'warn'} /></div>
      </div>
      <Routes>
        <Route path="/" element={<CommandScreen />} />
        <Route path="/approvals" element={<ApprovalsScreen />} />
        <Route path="/verifications" element={<Navigate to="/approvals" replace />} />
        <Route path="/chats" element={<ChatListScreen />} />
        <Route path="/chats/:id" element={<ChatScreen />} />
        <Route path="/system" element={<SystemScreen />} />
        <Route path="/automations" element={<AutomationsScreen />} />
        <Route path="/cron" element={<Navigate to="/automations" replace />} />
        <Route path="/memory" element={<MemoryScreen />} />
        <Route path="/gates/memorygate" element={<Navigate to="/memory" replace />} />
        <Route path="/gates/toolgate" element={<Navigate to="/automations" replace />} />
        <Route path="/suggestions" element={<SuggestionsScreen />} />
        <Route path="/apps" element={<Navigate to="/" replace />} />
        <Route path="/settings/character" element={<CharacterScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  </div>
}

function Sidebar({ close, summary, systemsOnline }: { close?: () => void, summary?: Any, systemsOnline: number }) {
  const navigate = useNavigate()
  const logout = async () => { await api.post('/api/auth/logout'); navigate('/login') }
  const pendingCount = Number(summary?.pending_verifications?.length || 0)
  const suggestionCount = Number(summary?.suggestions?.length || 0)

  return <aside className="sidebar">
    <div className="brand"><span className="brand-mark"><CommandIcon size={16} /></span><span><b>AgentGate</b><small>local instrument</small></span></div>
    <button className="sidebar-search" onClick={() => { close?.(); navigate('/') }}><Search size={14} /><span>Ctrl K</span></button>
    <nav>
      <div className="nav-label">Primary</div>
      {nav.map(({ to, label, icon: Icon, hint }) => <NavLink onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to={to} key={to}><Icon size={15} /><span><strong>{label}</strong><small>{hint}</small></span></NavLink>)}
    </nav>
    <div className="sidebar-live">
      <MiniDatum label="waiting" value={pendingCount} />
      <MiniDatum label="ideas" value={suggestionCount} />
      <MiniDatum label="systems" value={`${systemsOnline}/3`} />
    </div>
    <div className="sidebar-footer">
      <NavLink onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/settings/character"><Bot size={15} /><span><strong>Character</strong><small>persona settings</small></span></NavLink>
      <div className="sidebar-user"><span className="status-dot good" /><span>Owner</span><button className="logout" onClick={logout}><LogOut size={13} /></button></div>
    </div>
  </aside>
}

function Login() {
  const navigate = useNavigate()
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    try { await api.post('/api/auth/login', { key }); navigate('/') } catch { setError('Key rejected. Check the local owner key and try again.') }
  }
  return <div className="login"><form onSubmit={submit} className="login-card"><div className="brand"><span className="brand-mark"><CommandIcon size={16} /></span>AgentGate</div><h1>Open the instrument</h1><p>Enter the local owner key.</p><input autoFocus type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder="Owner key" /><Button type="submit" disabled={!key}>Open</Button>{error && <ErrorBox value={error} />}</form></div>
}

function CommandScreen() {
  const navigate = useNavigate()
  const omnibar = useRef<HTMLInputElement | null>(null)
  const bus = useAgentBus()
  const home = useLoad<Any>('/api/home')
  const system = useLoad<Any>('/api/system')
  const [intent, setIntent] = useState('')
  const approvals = home.data?.pending_verifications || []
  const suggestions = home.data?.suggestions || []
  const pinned = home.data?.pinned_apps || []
  const vitals = system.data?.vitals || {}
  const backup = system.data?.backups?.latest
  const anomaly = [
    ...['hermes', 'toolgate', 'memorygate'].filter((name) => home.data?.health?.[name]?.error).map((name) => `${name} is still`),
    vitals.disk?.percent > 85 ? 'disk above 85%' : '',
    backup?.name ? '' : 'backup not reported',
  ].filter(Boolean)

  useEffect(() => {
    const focus = () => omnibar.current?.focus()
    window.addEventListener('agentgate:focus-omnibar', focus)
    return () => window.removeEventListener('agentgate:focus-omnibar', focus)
  }, [])

  useEffect(() => {
    if (home.data || system.data) agentBus.heartbeat('Command')
  }, [home.data, system.data])

  const submitIntent = async (event: FormEvent) => {
    event.preventDefault()
    const value = intent.trim()
    if (!value) return
    agentBus.emit({ type: 'chat', label: 'intent routed', detail: value, source: 'Command' })
    if (value.startsWith('/approve')) return navigate('/approvals')
    if (value.startsWith('/status')) return navigate('/system')
    const session: Any = await api.post('/api/chats', { title: value.slice(0, 72) || 'New chat' })
    navigate(`/chats/${session.id || session.session_id}?prompt=${encodeURIComponent(value.replace(/^\/chat\s*/, ''))}`)
  }

  const decide = async (item: Any, status: string) => {
    const path = item.source === 'hermes' ? `/api/verifications/hermes/${item.source_id}/decision` : `/api/verifications/toolgate/${item.source_id}/decision`
    await api.post(path, item.source === 'hermes' ? { decision: status } : { status })
    agentBus.emit({ type: 'approval', label: status === 'approved' ? 'approved' : 'rejected', detail: item.title, source: item.source || 'approval' })
    await home.reload()
  }

  return <Page title="Command">
    <div className="command-grid">
      <section className="command-main">
        <form className="omnibar" onSubmit={submitIntent}>
          <Search size={15} />
          <input ref={omnibar} value={intent} onFocus={() => agentBus.setCoreState('listening', 0.28)} onBlur={() => agentBus.setCoreState(approvals.length ? 'blocked' : 'idle', approvals.length ? 0.45 : 0.18)} onChange={(event) => { setIntent(event.target.value); agentBus.setCoreState('listening', Math.min(0.7, 0.2 + event.target.value.length / 140)) }} placeholder="Type intent, /approve, /status, or /chat ..." />
          {machine('Ctrl K')}
        </form>
        <div className="vitals-line">
          <MiniDatum label="cpu" value={`${vitals.cpu_percent ?? 'n/a'}%`} />
          <MiniDatum label="ram" value={`${vitals.memory?.percent ?? 'n/a'}%`} />
          <MiniDatum label="disk" value={`${vitals.disk?.percent ?? 'n/a'}%`} tone={vitals.disk?.percent > 85 ? 'warn' : undefined} />
          <MiniDatum label="agent" value={approvals.length ? 'blocked' : 'idle'} tone={approvals.length ? 'warn' : 'good'} />
          <MiniDatum label="backup" value={backup?.name || 'missing'} tone={backup?.name ? undefined : 'warn'} />
          <MiniDatum label="waiting" value={approvals.length} />
        </div>
        {home.loading ? <Empty>Loading live state.</Empty> : home.error ? <ErrorBox value={home.error} retry={home.reload} /> : <>
          <section className="dense-section">
            <header><h2>Waiting for you</h2><span>{machine(`${approvals.length} pending`)}</span></header>
            {approvals.length ? approvals.slice(0, 3).map((item: Any) => <ApprovalLine key={item.id || item.source_id} item={item} onApprove={() => decide(item, 'approved')} onReject={() => decide(item, 'rejected')} />) : <Empty>Nothing needs you.</Empty>}
          </section>
          <section className="dense-section">
            <header><h2>Suggested next</h2><span>{machine(`${suggestions.length} items`)}</span></header>
            {suggestions.slice(0, 4).map((item: Any) => <div className="instrument-row" key={item.id}><span className="status-dot warn" /><div><strong>{item.title}</strong><p>{item.summary}</p></div><Button kind="quiet" onClick={() => navigate(`/chats?prompt=${encodeURIComponent(item.title)}`)}>Ask agent</Button></div>)}
            {!suggestions.length && <Empty>No suggestions in this view.</Empty>}
          </section>
          {anomaly.length > 0 && <section className="dense-section anomaly"><header><h2>Anomalies</h2><Status text="warn" tone="warn" /></header>{anomaly.map((item) => <div className="instrument-row" key={item}><span className="status-dot warn" /><div><strong>{item}</strong><p>Review the system screen before trusting automation.</p></div></div>)}</section>}
        </>}
      </section>
      <aside className="command-core">
        <Core state={bus.coreState} intensity={bus.intensity} size="medium" />
        <div className="pinned-row">{pinned.length ? pinned.map((app: Any) => <a key={app.id} href={app.url} target="_blank" rel="noreferrer">{app.name}<ExternalLink size={12} /></a>) : <span>No pinned apps.</span>}</div>
        <ActivityTicker />
      </aside>
    </div>
  </Page>
}

function ApprovalLine({ item, onApprove, onReject }: { item: Any, onApprove: () => void, onReject: () => void }) {
  const binding = bindingOf(item)
  return <div className="approval-line">
    <span className={`status-dot ${statusTone(item.severity || item.status)}`} />
    <div className="approval-copy"><strong>{item.title || 'Approval required'}</strong><p>{item.details || 'Review this exact action before it continues.'}</p><pre>{`type: ${binding.type}\nid: ${binding.id}\nversion: ${binding.version}\ndigest: ${binding.digest}`}</pre></div>
    <div className="thumb-actions"><Button onClick={onApprove}><Check size={14} />Approve</Button><Button kind="danger" onClick={onReject}>Reject</Button></div>
  </div>
}

function ActivityTicker() {
  const { events } = useAgentBus()
  const rows = events.slice(0, 10)
  return <section className="ticker"><header><h2>Live activity</h2>{machine(`${rows.length} events`)}</header>{rows.length ? rows.map((event) => <div className="ticker-row" key={event.id}><span>{machine(new Date(event.at).toLocaleTimeString())}</span><strong>{event.label}</strong><em>{event.source || event.type}</em></div>) : <Empty>Events will appear here when the system moves.</Empty>}</section>
}

function ApprovalsScreen() {
  const { data, error, loading, reload } = useLoad<Any[]>('/api/approvals')
  const [focused, setFocused] = useState(0)
  const rows = data || []
  const pending = rows.filter((item) => item.status === 'pending')
  const history = rows.filter((item) => item.status !== 'pending')

  const decide = async (item: Any, status: string) => {
    const path = item.source === 'hermes' ? `/api/verifications/hermes/${item.source_id}/decision` : `/api/verifications/toolgate/${item.source_id}/decision`
    await api.post(path, item.source === 'hermes' ? { decision: status } : { status })
    agentBus.emit({ type: 'approval', label: status === 'approved' ? 'approved' : 'rejected', detail: item.title, source: item.source || 'approval' })
    reload()
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!pending.length) return
      if (event.key === 'j') { event.preventDefault(); setFocused((value) => Math.min(pending.length - 1, value + 1)) }
      if (event.key === 'k') { event.preventDefault(); setFocused((value) => Math.max(0, value - 1)) }
      if (event.key.toLowerCase() === 'a') { event.preventDefault(); decide(pending[focused], 'approved') }
      if (event.key.toLowerCase() === 'r') { event.preventDefault(); decide(pending[focused], 'rejected') }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focused, pending])

  return <Page title="Approvals">
    <section className="screen-grid approvals-grid">
      <Card className="table-card">
        <header className="section-title"><h2>Waiting for you</h2><span>{machine('j/k a/r')}</span></header>
        {loading ? <Empty>Loading approvals.</Empty> : error ? <ErrorBox value={error} retry={reload} /> : pending.length ? pending.map((item, index) => <div className={`approval-line ${focused === index ? 'focused' : ''}`} key={item.id || item.source_id}>
          <span className={`status-dot ${statusTone(item.severity || item.status)}`} />
          <div className="approval-copy"><div className="source-line"><Status text={item.source || 'gate'} tone={statusTone(item.source)} /><strong>{item.title}</strong></div><p>{item.details || 'Review this exact action before it continues.'}</p><pre>{`type: ${bindingOf(item).type}\nid: ${bindingOf(item).id}\nversion: ${bindingOf(item).version}\ndigest: ${bindingOf(item).digest}`}</pre></div>
          <div className="thumb-actions"><Button onClick={() => decide(item, 'approved')}>Approve</Button><Button kind="danger" onClick={() => decide(item, 'rejected')}>Reject</Button></div>
        </div>) : <Empty>Nothing needs you.</Empty>}
      </Card>
      <Card className="table-card">
        <header className="section-title"><h2>History</h2><span>{machine(`${history.length} decided`)}</span></header>
        {history.length ? history.map((item) => <div className="instrument-row" key={item.id || item.source_id}><span className={`status-dot ${statusTone(item.status)}`} /><div><strong>{item.title}</strong><p>{item.status} by {item.actor || 'owner'} at {machine(item.updated_at || item.created_at || 'unknown')}</p></div></div>) : <Empty>Decisions will collapse here after action.</Empty>}
      </Card>
    </section>
  </Page>
}

function ChatListScreen() {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useLoad<Any>('/api/chats')
  const [query, setQuery] = useState('')
  const rows = Array.isArray(data) ? data : data?.sessions || data?.items || []
  const visible = rows.filter((row: Any) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase()))
  const create = async () => { const item: Any = await api.post('/api/chats', { title: 'New chat' }); navigate(`/chats/${item.id || item.session_id}`) }
  return <Page title="Chats">
    <div className="screen-toolbar"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sessions" /><Button onClick={create}><Plus size={14} />New chat</Button><Button kind="quiet" onClick={reload}><RefreshCw size={14} /></Button></div>
    <Card className="table-card">{loading ? <Empty>Loading sessions.</Empty> : error ? <ErrorBox value={error} retry={reload} /> : visible.length ? visible.map((row: Any) => {
      const id = row.id || row.session_id
      return <button className="chat-list-row" key={id} onClick={() => navigate(`/chats/${id}`)}><span className="status-dot muted" /><div><strong>{row.title || 'Untitled chat'}</strong><p>{row.preview || row.last_message || 'Hermes session'}</p></div>{machine(humanDate(row.updated_at || row.created_at))}<ChevronRight size={14} /></button>
    }) : <Empty>No sessions match this search.</Empty>}</Card>
  </Page>
}

function ChatScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const messages = useLoad<Any>(`/api/chats/${id}/messages`, Boolean(id))
  const [input, setInput] = useState('')
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [runId, setRunId] = useState('')
  const [toolEvents, setToolEvents] = useState<string[]>([])
  const [incognito, setIncognito] = useState(false)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [intensity, setIntensity] = useState('medium')
  const rows = Array.isArray(messages.data) ? messages.data : messages.data?.messages || []

  useEffect(() => {
    const prompt = new URLSearchParams(location.search).get('prompt')
    if (prompt) setInput(prompt)
  }, [location.search])

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!input.trim() || streaming) return
    const prompt = input
    setInput('')
    setDraft('')
    setToolEvents([])
    setStreaming(true)
    agentBus.setCoreState('thinking', 0.7)
    agentBus.emit({ type: 'chat', label: 'prompt sent', detail: prompt.slice(0, 80), source: 'Chat' })
    try {
      const response = await fetch(`/api/chats/${id}/stream`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ input: prompt, provider: provider || undefined, model: model || undefined, intensity, memory_incognito: incognito }),
      })
      if (!response.body) throw new Error('Streaming unavailable')
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const groups = buffer.split('\n\n')
        buffer = groups.pop() || ''
        for (const group of groups) {
          const eventName = group.split('\n').find((line) => line.startsWith('event:'))?.slice(6).trim() || 'message'
          const dataLine = group.split('\n').find((line) => line.startsWith('data:'))
          if (!dataLine) continue
          const raw = dataLine.slice(5).trim()
          try {
            const item = JSON.parse(raw)
            if (item.run_id) setRunId(String(item.run_id))
            if (eventName.includes('tool') || eventName.includes('subagent')) {
              agentBus.setCoreState('executing', 0.8)
              agentBus.emit({ type: 'tool', label: item.name || item.tool_name || 'tool execution', detail: item.summary, source: eventName })
              setToolEvents((previous) => [`${eventName}: ${item.name || item.tool_name || item.summary || 'working'}`, ...previous].slice(0, 10))
            } else {
              agentBus.setCoreState('speaking', 0.45 + Math.min(0.45, raw.length / 400))
            }
            setDraft((previous) => previous + (item.delta || item.text || item.content || ''))
          } catch {
            agentBus.setCoreState('speaking', 0.5)
            setDraft((previous) => previous + raw)
          }
        }
      }
      await messages.reload()
      agentBus.setCoreState('idle', 0.18)
    } catch (err) {
      agentBus.setCoreState('error', 1)
      toast.error(err instanceof Error ? err.message : 'Unable to stream response')
      setDraft(`Error: ${err instanceof Error ? err.message : 'Unable to stream response'}`)
    } finally {
      setStreaming(false)
    }
  }

  const stop = async () => { if (runId) await api.post(`/api/runs/${runId}/stop`); setStreaming(false); agentBus.setCoreState('error', 1); agentBus.emit({ type: 'error', label: 'run killed', source: 'Chat' }) }
  const fork = async () => { const item: Any = await api.post(`/api/chats/${id}/fork`, { title: 'Forked chat' }); navigate(`/chats/${item.id || item.session_id}`) }
  const copy = async (value: string) => navigator.clipboard?.writeText(value)
  const speak = (value: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(value)) } }

  return <Page title="Chat">
    <div className="chat-toolbar">
      <input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Provider" />
      <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="Model" />
      <select value={intensity} onChange={(event) => setIntensity(event.target.value)}><option value="light">Light</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very high</option></select>
      <label><input type="checkbox" checked={incognito} onChange={(event) => setIncognito(event.target.checked)} />Memory incognito</label>
      {streaming && <Button kind="danger" onClick={stop}><Square size={14} />Stop</Button>}
      <Button kind="quiet" onClick={fork}><History size={14} />Fork</Button>
      <Button kind="quiet" disabled>Promote to mission</Button>
    </div>
    <div className="chat-workspace">
      <Group className="chat-panels" orientation="horizontal">
        <Panel defaultSize={72} minSize={55}>
          <Card className="messages">{messages.loading ? <Empty>Loading conversation.</Empty> : messages.error ? <ErrorBox value={messages.error} retry={messages.reload} /> : <>
            {rows.map((message: Any, index: number) => <article className={`message ${message.role === 'user' ? 'user' : 'assistant'}`} key={message.id || index}><header><span>{message.role === 'user' ? 'You' : 'Hermes'}</span>{message.role !== 'user' && <span><button onClick={() => copy(messageText(message))}><Copy size={12} /></button><button onClick={() => speak(messageText(message))}><Volume2 size={12} /></button></span>}</header><div>{messageText(message)}</div>{message.trace && <details><summary>Trace</summary><pre>{JSON.stringify(message.trace, null, 2)}</pre></details>}</article>)}
            {draft && <article className="message assistant"><header><span>Hermes</span><span><button onClick={() => copy(draft)}><Copy size={12} /></button><button onClick={() => speak(draft)}><Volume2 size={12} /></button></span></header><div>{draft}</div></article>}
          </>}</Card>
        </Panel>
        <Separator className="panel-handle" />
        <Panel collapsible defaultSize={28} minSize={18}>
          <Card className="run-rail"><header><h2>Current run</h2><Status text={streaming ? 'active' : 'idle'} tone={streaming ? 'good' : 'muted'} /></header><MiniDatum label="mode" value={incognito ? 'incognito' : 'normal'} /><MiniDatum label="model" value={`${provider || 'auto'} / ${model || 'auto'}`} /><MiniDatum label="reasoning" value={intensity} /><div className="rail-list">{toolEvents.length ? toolEvents.map((item) => <div key={item}>{machine(item)}</div>) : <span>No live tools yet.</span>}</div></Card>
        </Panel>
      </Group>
      <form className="composer" onSubmit={send}><textarea value={input} onFocus={() => agentBus.setCoreState('listening', 0.25)} onChange={(event) => { setInput(event.target.value); agentBus.setCoreState('listening', Math.min(0.75, 0.2 + event.target.value.length / 200)) }} placeholder="Message Hermes" rows={3} /><Button type="submit" disabled={!input.trim() || streaming}><Send size={14} />Send</Button></form>
    </div>
  </Page>
}

function messageText(message: Any) {
  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.content)) return message.content.map((part: Any) => part.text || part.content || '').join('\n')
  return message.text || message.message || JSON.stringify(message)
}

function SystemScreen() {
  const { data, error, loading, reload } = useLoad<Any>('/api/system')
  const [history, setHistory] = useState<number[]>([])
  const vitals = data?.vitals || {}
  const containers = data?.containers?.results || []
  const backup = data?.backups?.latest
  useEffect(() => {
    if (vitals.cpu_percent !== undefined) {
      setHistory((items) => [...items.slice(-24), Number(vitals.cpu_percent)])
      agentBus.emit({ type: 'system', label: 'vitals tick', detail: `${vitals.cpu_percent}%`, source: 'System' })
    }
  }, [vitals.cpu_percent])
  return <Page title="System">
    {loading ? <Empty>Loading system telemetry.</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <>
      <div className="vitals-grid"><Metric title="CPU" value={`${vitals.cpu_percent ?? 'n/a'}%`} detail={`${vitals.cpu_count || 0} cores`} data={history} /><Metric title="RAM" value={`${vitals.memory?.percent ?? 'n/a'}%`} detail={`${vitals.memory?.available || 'unknown'} free`} /><Metric title="Disk" value={`${vitals.disk?.percent ?? 'n/a'}%`} detail={`${vitals.disk?.free || 'unknown'} free`} tone={vitals.disk?.percent > 85 ? 'warn' : 'good'} /><Metric title="Backup" value={backup?.name || 'missing'} detail={backup?.path || 'no archive reported'} tone={backup?.name ? 'good' : 'warn'} /></div>
      <Card className="table-card"><header className="section-title"><h2>Containers</h2><Button kind="quiet" onClick={reload}><RefreshCw size={14} />Refresh</Button></header>{containers.length ? containers.map((item: Any) => <div className="system-row" key={item.id || item.name}><span className={`status-dot ${statusTone(item.status)}`} /><div><strong>{item.name}</strong><p>{item.image}</p></div>{machine(item.status)}{machine(item.id)}</div>) : <Empty>No containers reported.</Empty>}</Card>
    </>}
  </Page>
}

function Metric({ title, value, detail, tone = 'good', data = [] }: { title: string, value: string, detail: string, tone?: string, data?: number[] }) {
  const points = data.length ? data.map((value, index) => `${index * 6},${36 - Math.min(35, value / 3)}`).join(' ') : ''
  return <Card className="metric"><div><span>{title}</span>{machine(value)}</div><Status text={tone === 'warn' ? 'warn' : 'ok'} tone={tone} /><p>{detail}</p>{points && <svg viewBox="0 0 144 40" preserveAspectRatio="none"><polyline points={points} /></svg>}</Card>
}

function SuggestionsScreen() {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useLoad<Any[]>('/api/suggestions')
  const rows = data || []
  const ask = async (item: Any) => { const session: Any = await api.post('/api/chats', { title: `Suggestion: ${item.title}` }); navigate(`/chats/${session.id || session.session_id}?prompt=${encodeURIComponent(`Help me evaluate this suggestion:\n\n${item.title}\n${item.summary}`)}`) }
  const patch = async (id: string, status: string) => { await api.patch(`/api/suggestions/${id}`, { status }); agentBus.emit({ type: 'suggestion', label: status, source: 'Suggestions' }); reload() }
  return <Page title="Suggestions"><Card className="table-card">{loading ? <Empty>Loading suggestions.</Empty> : error ? <ErrorBox value={error} retry={reload} /> : rows.length ? rows.map((item) => <div className="instrument-row" key={item.id}><span className={`status-dot ${statusTone(item.status)}`} /><div><strong>{item.title}</strong><p>{item.summary}</p><small>{machine(`${item.category || 'general'} · ${item.confidence || 'unknown'} · ${item.urgency || 'normal'}`)}</small></div><div className="row-actions"><Button kind="quiet" onClick={() => ask(item)}>Ask agent</Button><Button kind="quiet" onClick={() => patch(item.id, 'saved')}>Save to memory</Button><Button kind="quiet" onClick={() => patch(item.id, 'dismissed')}>Dismiss</Button></div></div>) : <Empty>No suggestions in this view.</Empty>}</Card></Page>
}

function AutomationsScreen() {
  const { data, error, loading, reload } = useLoad<Any>('/api/automations')
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', schedule: '0 9 * * *', prompt: '', deliver: 'local' })
  const jobs = data?.jobs || []
  const toolgate = data?.toolgate_automations || []
  const save = async (event: FormEvent) => { event.preventDefault(); await api.post('/api/cron/jobs', form); setOpen(false); reload() }
  const action = async (id: string, name: string) => { await api.post(`/api/cron/jobs/${id}/${name}`); agentBus.emit({ type: 'cron', label: name, source: 'Automations' }); reload() }
  return <Page title="Automations">
    <div className="screen-toolbar"><Button onClick={() => setOpen(true)}><Plus size={14} />New job</Button><Button kind="quiet" onClick={reload}><RefreshCw size={14} /></Button></div>
    {open && <Card className="form-card"><form onSubmit={save}><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Job name" required /><input value={form.schedule} onChange={(event) => setForm({ ...form, schedule: event.target.value })} placeholder="Cron schedule" required /><textarea value={form.prompt} onChange={(event) => setForm({ ...form, prompt: event.target.value })} placeholder="What should the agent do?" required /><input value={form.deliver} onChange={(event) => setForm({ ...form, deliver: event.target.value })} placeholder="Delivery target" /><Button type="submit">Create job</Button></form></Card>}
    <Card className="table-card">{loading ? <Empty>Loading automations.</Empty> : error ? <ErrorBox value={error} retry={reload} /> : [...jobs, ...toolgate].length ? [...jobs, ...toolgate].map((job: Any) => {
      const id = job.id || job.job_id || job.name
      return <div className="automation-row" key={id}><span className={`status-dot ${statusTone(job.status || (job.paused ? 'paused' : 'running'))}`} /><div><strong>{job.name || id}</strong><p>{job.prompt || job.description || job.summary || 'Runs without owner input until verification is needed.'}</p></div>{machine(job.schedule || 'pattern')}{machine(job.last_run_at || job.last_run || 'never')}{machine(job.next_run_at || job.next_run || 'unknown')}<div className="row-actions"><Button kind="quiet" onClick={() => action(id, 'run')}>Run now</Button>{job.paused ? <Button kind="quiet" onClick={() => action(id, 'resume')}>Resume</Button> : <Button kind="quiet" onClick={() => action(id, 'pause')}>Pause</Button>}</div></div>
    }) : <Empty>No jobs yet. Create one when a repeated task is worth automation.</Empty>}</Card>
  </Page>
}

function MemoryScreen() {
  const { data, error, loading, reload } = useLoad<Any>('/api/gates/memorygate')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Any[]>([])
  const search = async (event: FormEvent) => { event.preventDefault(); const value: Any = await api.post('/api/gates/memorygate/search', { query, limit: 10 }); setResults(Array.isArray(value) ? value : value.items || value.memories || value.results || []); agentBus.emit({ type: 'system', label: 'memory search', detail: query, source: 'Memory' }) }
  const recent = data?.memories || []
  return <Page title="Memory">
    <form className="memory-search" onSubmit={search}><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="What does the agent believe about..." /><Button type="submit">Search</Button><a className="button quiet" href={`${window.location.protocol}//${window.location.hostname}:8020/skills`} target="_blank" rel="noreferrer">Skill editor <ExternalLink size={13} /></a></form>
    {loading ? <Empty>Loading memory.</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <div className="memory-layout"><Card className="table-card"><header className="section-title"><h2>{results.length ? 'Results' : 'Recent memories'}</h2></header>{(results.length ? results : recent).slice(0, 12).map((item: Any, index: number) => <details className="memory-row" key={item.id || index}><summary><span className="status-dot good" /><strong>{item.title || item.memory_type || item.kind || 'Memory'}</strong>{machine(item.id || item.kind || 'memory')}</summary><p>{item.content || item.summary || item.text || JSON.stringify(item)}</p><pre>{JSON.stringify(item.source_chain || item.evidence || { source: item.source || 'MemoryGate' }, null, 2)}</pre></details>)}</Card><Card className="table-card"><header className="section-title"><h2>Briefing</h2></header><pre>{JSON.stringify(data?.briefing || {}, null, 2)}</pre></Card></div>}
  </Page>
}

function CharacterScreen() {
  const { data, error, loading, reload } = useLoad<Any>('/api/character')
  const [form, setForm] = useState<Any | null>(null)
  useEffect(() => { if (data) setForm(data) }, [data])
  const save = async (event: FormEvent) => { event.preventDefault(); await api.put('/api/character', form); agentBus.emit({ type: 'system', label: 'character saved', source: 'Character' }); reload() }
  if (loading || !form) return <Page title="Character"><Empty>Loading character.</Empty></Page>
  return <Page title="Character">
    {error && <ErrorBox value={error} retry={reload} />}
    <Card className="form-card character-form"><form onSubmit={save}><label>Name<input value={form.name || ''} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>How the agent calls you<input value={form.owner_name || ''} onChange={(event) => setForm({ ...form, owner_name: event.target.value })} /></label><label>Avatar URL<input value={form.avatar_url || ''} onChange={(event) => setForm({ ...form, avatar_url: event.target.value })} /></label><label>Personality<textarea value={form.personality || ''} onChange={(event) => setForm({ ...form, personality: event.target.value })} /></label><label>Speaking style<textarea value={form.speaking_style || ''} onChange={(event) => setForm({ ...form, speaking_style: event.target.value })} /></label><label>Boundaries<textarea value={form.boundaries || ''} onChange={(event) => setForm({ ...form, boundaries: event.target.value })} /></label><label>Response length<select value={form.response_length || 'detailed'} onChange={(event) => setForm({ ...form, response_length: event.target.value })}><option value="straight">Straight</option><option value="detailed">Detailed</option><option value="verbose">Verbose</option></select></label><p>Boundaries here are persona-level. Hard limits live in ToolGate and cannot be loosened from this screen.</p><Button type="submit">Save character</Button></form></Card>
    <Card className="table-card"><header className="section-title"><h2>SOUL export preview</h2></header><pre>{form.context_preview || 'Preview will appear after saving.'}</pre></Card>
  </Page>
}

function App() {
  const [ready, setReady] = useState<boolean | null>(null)
  useEffect(() => { api.get('/api/auth/session').then(() => setReady(true)).catch(() => setReady(false)) }, [])
  if (ready === null) return <div className="splash">Loading AgentGate.</div>
  return <BrowserRouter>{ready ? <Shell /> : <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>}<Toaster position="top-right" richColors theme="dark" /></BrowserRouter>
}

export default App
