import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { Theme } from '@radix-ui/themes'
import clsx from 'clsx'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, AppWindow, Bot, Brain, Check, ChevronRight, Clock3, Command, Copy, ExternalLink, Gauge, HeartPulse, History, Lightbulb, LogOut, Menu, MessageSquare, Moon, Plus, RefreshCw, RotateCcw, Search, Send, ShieldCheck, Sparkles, Square, Sun, Trash2, Volume2, Wrench, X } from 'lucide-react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { Toaster, toast } from 'sonner'
import { api, ApiError, csrfHeaders } from './api'
import { Button, Card, Empty, ErrorBox, Page, Status, ThemeToggle } from './components/ui-primitives'
import { useLoad } from './hooks/use-load'

type Any = Record<string, any>
type Theme = 'light' | 'dark'

const nav = [
  { to: '/', label: 'Command', icon: Gauge, hint: 'What matters now' },
  { to: '/chats', label: 'Chats', icon: MessageSquare, hint: 'Sessions with your brain' },
  { to: '/approvals', label: 'Approvals', icon: ShieldCheck, hint: 'Approve or reject' },
  { to: '/automations', label: 'Automations', icon: Clock3, hint: 'Jobs and ToolGate runs' },
  { to: '/memory', label: 'Memory', icon: Brain, hint: 'Recall and skills' },
  { to: '/system', label: 'System', icon: HeartPulse, hint: 'Host and services' },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb, hint: 'Ideas and discoveries' },
]
const routeMeta = [
  { match: '/settings/character', label: 'Character', kicker: 'Identity', note: 'Brain voice, posture, and boundaries.' },
  { match: '/approvals', label: 'Approvals', kicker: 'Decision queue', note: 'Pending approvals and action history.' },
  { match: '/automations', label: 'Automations', kicker: 'Automation', note: 'Scheduled intelligence and ToolGate automations.' },
  { match: '/memory', label: 'Memory', kicker: 'MemoryGate', note: 'Personal memory, search, and skill editor access.' },
  { match: '/system', label: 'System', kicker: 'Operations', note: 'Runtime status placeholder until SystemGate lands.' },
  { match: '/suggestions', label: 'Suggestions', kicker: 'Discovery', note: 'Recommendations gathered from your signals.' },
  { match: '/chats', label: 'Chats', kicker: 'Conversation', note: 'Brain sessions, forks, and active context.' },
  { match: '/', label: 'Command', kicker: 'Command', note: 'A quiet summary of what needs attention.' },
]

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem('agentgate-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return 'dark'
}

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme
  window.localStorage.setItem('agentgate-theme', theme)
}
function redactForDisplay(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactForDisplay)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => (
        /token|secret|password|authorization|cookie|api.?key/i.test(key)
          ? [key, '[redacted]']
          : [key, redactForDisplay(entry)]
      )),
    )
  }
  return value
}

function Sidebar({ mobile, close, summary, theme, toggleTheme }: { mobile?: boolean, close?: () => void, summary?: Any, theme: Theme, toggleTheme: () => void }) {
  const navigate = useNavigate()
  const logout = async () => { await api.post('/api/auth/logout'); navigate('/login') }
  const items = (list: typeof nav) => list.map(({ to, label, icon: Icon, hint }) => <NavLink onClick={close} className={({ isActive }) => clsx('nav-item', isActive && 'active')} to={to} key={to}><Icon size={16} /><span><strong>{label}</strong><small>{hint}</small></span></NavLink>)
  const pendingCount = Number(summary?.pending_verifications?.length || 0)
  const suggestionCount = Number(summary?.suggestions?.length || 0)
  const systemsOnline = ['brain', 'toolgate', 'memorygate'].filter(name => !summary?.health?.[name]?.error).length
  return <aside className={mobile ? 'drawer' : 'sidebar'}><div className="brand"><span className="brand-mark"><Command size={18} /></span><span><b>AgentGate</b><small>Enterprise</small></span>{mobile && <button className="icon-button" onClick={close} aria-label="Close navigation"><X size={18} /></button>}</div><button className="sidebar-search"><Search size={14} /><span>Search</span><b>+</b></button><div className="sidebar-mini"><div><Lightbulb size={15} /><span>Suggestions</span><small>{suggestionCount}</small></div><div><ShieldCheck size={15} /><span>Approvals</span><small>{pendingCount}</small></div></div><nav><div className="nav-label">AgentGate</div>{items(nav)}</nav><div className="sidebar-footer"><div className="support-tile"><span><HeartPulse size={15} />Support center</span><i className="dot" /></div><NavLink onClick={close} className={({ isActive }) => clsx('nav-item', isActive && 'active')} to="/settings/character"><Bot size={16} /><span><strong>Character / Settings</strong><small>Identity, tone, and limits</small></span></NavLink><div className="sidebar-user"><span className="avatar">O</span><div><strong>Owner</strong><small>{systemsOnline}/3 systems online</small></div><button className="logout" onClick={logout}><LogOut size={14} /></button></div></div></aside>
}

function Shell({ theme, toggleTheme }: { theme: Theme, toggleTheme: () => void }) {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const summary = useLoad<Any>('/api/home')
  const current = routeMeta.find(item => item.match !== '/' ? pathname.startsWith(item.match) : pathname === '/') || routeMeta[routeMeta.length - 1]
  return <div className="shell"><Sidebar summary={summary.data || undefined} theme={theme} toggleTheme={toggleTheme} /><button className="mobile-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>{open && <div className="drawer-wrap"><div className="backdrop" onClick={() => setOpen(false)} /><Sidebar mobile close={() => setOpen(false)} summary={summary.data || undefined} theme={theme} toggleTheme={toggleTheme} /></div>}<main><div className="topbar"><div className="topbar-breadcrumb"><span className="topbar-icon"><Square size={14} /></span><span>{current.kicker}</span><ChevronRight size={14} /><strong>{current.label}</strong></div><div className="topbar-actions"><button className="view-button"><Wrench size={14} />View options</button><button className="layout-button active"><AppWindow size={15} /></button><button className="layout-button"><Menu size={15} /></button></div></div><Routes><Route path="/" element={<Home />} /><Route path="/chats" element={<ChatList />} /><Route path="/chats/:id" element={<Chat />} /><Route path="/approvals" element={<Approvals />} /><Route path="/verifications" element={<Navigate to="/approvals" replace />} /><Route path="/suggestions" element={<Suggestions />} /><Route path="/automations" element={<Automations />} /><Route path="/cron" element={<Navigate to="/automations" replace />} /><Route path="/memory" element={<Memory />} /><Route path="/gates/memorygate" element={<Navigate to="/memory" replace />} /><Route path="/gates/toolgate" element={<Navigate to="/automations" replace />} /><Route path="/system" element={<System />} /><Route path="/apps" element={<Navigate to="/" replace />} /><Route path="/settings/character" element={<Character />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main></div>
}

function Login() { const navigate = useNavigate(); const [key, setKey] = useState(''); const [error, setError] = useState(''); const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); try { await api.post('/api/auth/login', { key }); navigate('/') } catch { setError('Invalid key') } }; return <div className="login"><form onSubmit={submit} className="login-card"><div className="brand"><span className="brand-mark"><Command size={19} /></span>AgentGate</div><h1>Your personal brain dashboard</h1><p>Enter the local owner key configured for AgentGate.</p><input autoFocus type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Owner key" /><Button type="submit" disabled={!key}>Open AgentGate</Button>{error && <ErrorBox value={error} />}</form></div> }

function Home() { const { data, error, loading, reload } = useLoad<Any>('/api/home'); if (loading) return <Page title="Command"><Empty>Loading your command center...</Empty></Page>; if (error) return <Page title="Command" actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14} />Refresh</Button>}><ErrorBox value={error} retry={reload} /></Page>; const health = data?.health || {}; const pending = data?.pending_verifications || []; const suggestions = data?.suggestions || []; const pinnedApps = data?.pinned_apps || []; const onlineCount = ['brain','toolgate','memorygate'].filter(name => !health[name]?.error).length; const rows = [...pending.map((item: Any, index: number) => ({ id: `pending-${item.id || index}`, title: item.title || item.summary?.title || 'Approval required', detail: item.details || 'Brain is waiting for your decision.', kind: 'approval', red: '12m', green: '3m+', amber: '45m', blue: '2d', age: 'now' })), ...suggestions.map((item: Any, index: number) => ({ id: `suggestion-${item.id || index}`, title: item.title, detail: item.summary, kind: 'suggestion', red: '28m+', green: '8m+', amber: '30m', blue: '1d', age: 'today' })), ...['brain','toolgate','memorygate'].map((name, index) => ({ id: `gate-${name}`, title: `${name[0].toUpperCase()}${name.slice(1)} status`, detail: health[name]?.error ? 'Offline or unreachable' : 'Healthy and responding.', kind: 'gate', red: `${9 + index}m+`, green: `${1 + index}m+`, amber: `${20 + index * 5}m`, blue: `${index + 1}d`, age: onlineCount === 3 ? 'online' : 'check' }))]; return <Page title="Command" note="What needs attention now.">{pinnedApps.length > 0 && <div className="app-grid">{pinnedApps.map((app: Any) => <Card key={app.id} className="app-card"><AppWindow size={19} className="accent"/><strong>{app.name}</strong><p>{app.description || 'Pinned app'}</p><small>{app.url}</small><a className="button primary" href={app.url} target="_blank" rel="noreferrer">Open <ExternalLink size={14}/></a></Card>)}</div>}<div className="filterbar"><button className="filter-button"><Clock3 size={14} />Last 7 days</button><button className="filter-button"><Plus size={14} />Filter</button><div className="filter-spacer" /><button className="filter-button">Created</button><button className="icon-filter"><Search size={14} /></button><button className="icon-filter" onClick={reload}><RefreshCw size={14} /></button></div><Card className="console-table ticket-table"><div className="table-list">{rows.concat(rows.slice(0, Math.max(0, 16 - rows.length))).slice(0, 16).map((item: Any, index: number) => <div className="ticket-row" key={`${item.id}-${index}`}><span className="ticket-dot" /><Activity size={13} className="ticket-signal" /><div className="ticket-title"><strong>{item.title}</strong><p>{item.detail}</p></div><div className="ticket-metrics"><Status text={item.red} tone="red" /><Status text={item.green} tone="green" /><Status text={`-${item.amber}`} tone="amber" /><Status text={`-${item.blue}`} tone="blue" /></div><span className="ticket-age">{item.age} via Brain</span><span className="tiny-avatar">A</span></div>)}</div></Card></Page> }

function ChatList() {
  const navigate = useNavigate()
  const { data, error, loading, reload } = useLoad<any>('/api/chats')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('recent')
  const rows = Array.isArray(data) ? data : data?.sessions || data?.items || []
  const create = async () => { try { const item: any = await api.post('/api/chats', { title: 'New chat' }); navigate(`/chats/${item.id || item.session_id}`) } catch (err) { alert(err instanceof Error ? err.message : 'Unable to create chat') } }
  const rename = async (row: Any) => { const title = window.prompt('Chat title', row.title || ''); if (title?.trim()) { await api.patch(`/api/chats/${row.id || row.session_id}`, { title: title.trim() }); reload() } }
  const remove = async (row: Any) => { if (window.confirm(`Delete “${row.title || 'this chat'}”? This cannot be undone.`)) { await api.del(`/api/chats/${row.id || row.session_id}`); reload() } }
  const visible = rows.filter((row: Any) => {
    const textMatches = JSON.stringify(row).toLowerCase().includes(query.toLowerCase())
    if (filter === 'archived') return textMatches && Boolean(row.archived || row.end_reason)
    if (filter === 'forked') return textMatches && Boolean(row.parent_id || row.parent_session_id)
    if (filter === 'incognito') return textMatches && Boolean(row.incognito || row.memory_incognito)
    if (filter === 'active') return textMatches && !row.archived && !row.end_reason
    return textMatches
  }).sort((left: Any, right: Any) => {
    if (sort === 'title') return String(left.title || '').localeCompare(String(right.title || ''))
    const a = new Date(left.updated_at || left.created_at || 0).getTime()
    const b = new Date(right.updated_at || right.created_at || 0).getTime()
    return sort === 'oldest' ? a - b : b - a
  })
  return <Page title="Chats" note="Your brain conversations." actions={<Button onClick={create}><Plus size={15}/>New chat</Button>}><div className="toolbar toolbar-console"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search chats"/><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter chats"><option value="all">All</option><option value="active">Active</option><option value="archived">Archived</option><option value="forked">Forked</option><option value="incognito">Incognito</option></select><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort chats"><option value="recent">Recent</option><option value="oldest">Oldest</option><option value="title">Title</option></select><Button kind="quiet" onClick={reload}><RefreshCw size={14}/></Button></div>{loading ? <Empty>Loading chats...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <Card className="console-table"><div className="table-toolbar"><div className="table-title"><strong>Sessions</strong><small>Dense list view for active and archived conversations.</small></div><div className="table-badges"><Status text={`${visible.length} chats`} /></div></div><div className="table-list">{visible.length ? visible.map((row: Any) => { const id = row.id || row.session_id; return <div className="chat-row" key={id}><button className="chat-open" onClick={() => navigate(`/chats/${id}`)}><MessageSquare size={16}/><div><strong>{row.title || 'Untitled chat'}</strong><p>{row.preview || row.last_message || row.source || 'Brain conversation'}</p><small>{row.model || row.provider || row.source || 'Brain'} {row.parent_id || row.parent_session_id ? '- forked' : ''}</small></div><span>{row.updated_at ? new Date(row.updated_at).toLocaleDateString() : ''}</span><ChevronRight size={16}/></button><div className="chat-actions"><Button kind="quiet" onClick={() => rename(row)}>Rename</Button><Button kind="quiet" onClick={() => remove(row)}><Trash2 size={14}/></Button></div></div> }) : <Empty>No chats match these controls.</Empty>}</div></Card>}</Page>
}

function messageText(message: Any) { if (typeof message.content === 'string') return message.content; if (Array.isArray(message.content)) return message.content.map((part: Any) => part.text || part.content || '').join('\n'); return message.text || message.message || JSON.stringify(message) }
function Chat() {
  const { id = '' } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const messages = useLoad<any>(`/api/chats/${id}/messages`, Boolean(id))
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [draft, setDraft] = useState('')
  const [incognito, setIncognito] = useState(false)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [intensity, setIntensity] = useState('medium')
  const [runId, setRunId] = useState('')
  const [toolEvents, setToolEvents] = useState<string[]>([])
  const [lastPrompt, setLastPrompt] = useState('')

  useEffect(() => {
    const prompt = new URLSearchParams(location.search).get('prompt')
    if (prompt) setInput(prompt)
  }, [id, location.search])

  const send = async (event: FormEvent) => {
    event.preventDefault()
    if (!input.trim() || streaming) return
    const prompt = input
    setLastPrompt(prompt)
    setInput('')
    setDraft('')
    setToolEvents([])
    setStreaming(true)
    try {
      const response = await fetch(`/api/chats/${id}/stream`, {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
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
          const eventName = group.split('\n').find(line => line.startsWith('event:'))?.slice(6).trim() || 'message'
          const dataLine = group.split('\n').find(line => line.startsWith('data:'))
          if (!dataLine) continue
          const raw = dataLine.slice(5).trim()
          try {
            const item = JSON.parse(raw)
            if (item.run_id) setRunId(String(item.run_id))
            if (eventName.includes('tool') || eventName.includes('subagent')) setToolEvents(previous => [...previous, `${eventName}: ${item.name || item.tool_name || item.summary || 'working'}`].slice(-12))
            setDraft(previous => previous + (item.delta || item.text || item.content || ''))
          } catch {
            setDraft(previous => previous + raw)
          }
        }
      }
      await messages.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to stream response')
      setDraft(`Error: ${err instanceof Error ? err.message : 'Unable to stream response'}`)
    } finally {
      setStreaming(false)
    }
  }

  const rows = Array.isArray(messages.data) ? messages.data : messages.data?.messages || []
  const fork = async () => {
    const item: any = await api.post(`/api/chats/${id}/fork`, { title: 'Forked chat' })
    toast.success('Fork created')
    navigate(`/chats/${item.id || item.session_id}`)
  }
  const retry = () => { if (lastPrompt && !streaming) { setInput(lastPrompt) } }
  const stop = async () => { if (runId) { await api.post(`/api/runs/${runId}/stop`); setStreaming(false) } }
  const copy = async (value: string) => { await navigator.clipboard?.writeText(value) }
  const speak = (value: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(value)) } }

  return <Page title="Chat" note="Your brain is connected through its native session API." actions={<>
    <input className="chat-control" value={provider} onChange={e => setProvider(e.target.value)} placeholder="Provider" aria-label="Provider" />
    <input className="chat-control" value={model} onChange={e => setModel(e.target.value)} placeholder="Model" aria-label="Model" />
    <select className="chat-control" value={intensity} onChange={e => setIntensity(e.target.value)} aria-label="Reasoning intensity"><option value="light">Light</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very high</option></select>
    <label className="toggle"><input type="checkbox" checked={incognito} onChange={e => setIncognito(e.target.checked)} />Memory incognito</label>
    {streaming && runId && <Button kind="danger" onClick={stop}><Square size={14} />Stop</Button>}
    {lastPrompt && <Button kind="quiet" onClick={retry}><RotateCcw size={14} />Retry</Button>}
    <Button kind="quiet" onClick={fork}><History size={14} />Fork</Button>
  </>}>
    <div className="chat-workspace chat-surface">
      <Group className="chat-panels" id="agentgate-chat-layout" orientation="horizontal">
        <Panel defaultSize={72} minSize={52}>
          <Card className="messages">
        {messages.loading ? <Empty>Loading conversation...</Empty> : messages.error ? <ErrorBox value={messages.error} retry={messages.reload} /> : <>
          {rows.map((message: Any, index: number) => <article className={`message ${message.role === 'user' ? 'user' : 'assistant'}`} key={message.id || index}><span>{message.role === 'user' ? 'You' : 'Brain'}</span><div>{messageText(message)}</div></article>)}
          {toolEvents.length > 0 && <div className="tool-events">{toolEvents.map((item, index) => <div key={`${item}-${index}`}><Activity size={13} />{item}</div>)}</div>}
          {draft && <article className="message assistant"><span>Brain <button className="message-action" onClick={() => copy(draft)}><Copy size={13} /></button><button className="message-action" onClick={() => speak(draft)}><Volume2 size={13} /></button></span><div>{draft || 'Thinking...'}</div></article>}
        </>}
          </Card>
        </Panel>
        <Separator className="panel-handle" />
        <Panel collapsible defaultSize={28} minSize={18}>
          <Card className="chat-rail">
            <div className="chat-rail-section">
              <span className="metric-label">Session</span>
              <strong>Current run</strong>
              <p>Model routing, memory mode, and execution activity stay visible while you talk.</p>
            </div>
            <div className="chat-rail-stack">
              <div className="chat-rail-card">
                <span className="metric-label">Mode</span>
                <strong>{incognito ? 'Incognito memory' : 'Normal memory'}</strong>
                <small>{provider || 'Auto provider'} {model ? `- ${model}` : '- auto model'}</small>
              </div>
              <div className="chat-rail-card">
                <span className="metric-label">Reasoning</span>
                <strong>{intensity.replace('_', ' ')}</strong>
                <small>{streaming ? 'Brain is generating now' : 'Ready for the next prompt'}</small>
              </div>
              <div className="chat-rail-card">
                <span className="metric-label">Live activity</span>
                {toolEvents.length ? toolEvents.map((item, index) => <div className="chat-activity" key={`${item}-${index}`}><Activity size={13} /><span>{item}</span></div>) : <small>No active tools yet. Tool runs will appear here.</small>}
              </div>
            </div>
          </Card>
        </Panel>
      </Group>
      <form className="composer" onSubmit={send}>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Message Brain" rows={3} />
        <Button type="submit" disabled={!input.trim() || streaming}>{streaming ? <Activity size={15} /> : <Send size={15} />} {streaming ? 'Working' : 'Send'}</Button>
      </form>
    </div>
  </Page>
}

function Approvals() { const { data, error, loading, reload } = useLoad<Any[]>('/api/approvals'); const [view, setView] = useState('pending'); const [source, setSource] = useState('all'); const decide = async (item: Any, status: string) => { if (status === 'approved' && ['warning', 'high', 'critical'].includes(String(item.severity).toLowerCase()) && !window.confirm('This is a higher-risk action. Approve only if the action and arguments are correct.')) return; try { const path = item.source === 'brain' ? `/api/verifications/brain/${item.source_id}/decision` : `/api/verifications/toolgate/${item.source_id}/decision`; await api.post(path, item.source === 'brain' ? { decision: status } : { status }); reload() } catch (err) { alert(err instanceof Error ? err.message : 'Unable to decide') } }; const visible = (data || []).filter(item => (view === 'pending' ? item.status === 'pending' : item.status !== 'pending') && (source === 'all' || item.source === source)); return <Page title="Approvals" note="Owner decisions from your brain, ToolGate, and future gates." actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14}/>Refresh</Button>}><div className="toolbar"><select value={view} onChange={e=>setView(e.target.value)} aria-label="Approval status"><option value="pending">Pending</option><option value="history">History</option></select><select value={source} onChange={e=>setSource(e.target.value)} aria-label="Approval source"><option value="all">All sources</option><option value="brain">Brain</option><option value="toolgate">ToolGate</option></select></div>{loading ? <Empty>Loading approvals...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <Card>{visible.length ? visible.map((item: Any) => { const binding = item.action?.binding || {}; return <div className="verification" key={`${item.source}-${item.source_id || item.id}`}><div><div className="actions"><Status text={item.source || 'toolgate'} /><Status text={item.severity || 'normal'} tone={['high','critical','warning'].includes(String(item.severity).toLowerCase()) ? 'danger' : 'muted'} /></div><strong>{item.title}</strong><p>{item.details || 'Review this requested action before it continues.'}</p><small>{item.status} {item.actor ? `- ${item.actor}` : ''} {item.created_at ? `- ${new Date(item.created_at).toLocaleString()}` : ''} {item.expires_at ? `- expires ${new Date(item.expires_at).toLocaleString()}` : ''}</small><pre className="json-view">{JSON.stringify(redactForDisplay({ object_type: item.action?.subject_type, object_id: item.action?.subject_id, version: item.action?.subject_version, argument_digest: binding.args_digest }), null, 2)}</pre><details className="verification-details"><summary>Full action details</summary><pre className="json-view">{JSON.stringify(redactForDisplay(item.action || {}), null, 2)}</pre></details></div>{item.status === 'pending' && <div className="actions"><Button onClick={() => decide(item, 'approved')}><Check size={14}/>Approve</Button><Button kind="danger" onClick={() => decide(item, 'rejected')}>Reject</Button></div>}</div> }) : <Empty>{view === 'pending' ? 'Nothing needs your approval.' : 'No completed approvals yet.'}</Empty>}</Card>}</Page> }

function Suggestions() { const navigate = useNavigate(); const { data, error, loading, reload } = useLoad<Any[]>('/api/suggestions'); const [open, setOpen] = useState(false); const [view, setView] = useState('new'); const [title, setTitle] = useState(''); const [summary, setSummary] = useState(''); const create = async (event: FormEvent) => { event.preventDefault(); await api.post('/api/suggestions', { title, summary }); setTitle(''); setSummary(''); setOpen(false); reload() }; const status = async (id: string, value: string) => { await api.patch(`/api/suggestions/${id}`, { status: value }); reload() }; const ask = async (item: Any) => { const session: Any = await api.post('/api/chats', { title: `Suggestion: ${item.title}` }); const id = session.id || session.session_id; navigate(`/chats/${id}?prompt=${encodeURIComponent(`Help me evaluate this suggestion:\n\n${item.title}\n${item.summary}`)}`) }; const visible = (data || []).filter(item => view === 'all' || item.status === view); return <Page title="Suggestions" note="Ideas from your brain and from you." actions={<Button onClick={() => setOpen(true)}><Plus size={15}/>Add</Button>}><div className="toolbar"><select value={view} onChange={e=>setView(e.target.value)} aria-label="Suggestion status"><option value="new">New</option><option value="saved">Saved</option><option value="acted">Acted</option><option value="dismissed">Dismissed</option><option value="all">All</option></select></div>{open && <Card className="form-card"><form onSubmit={create}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Suggestion title" required/><textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Why does this matter?" required/><div className="actions"><Button type="submit">Save</Button><Button kind="quiet" onClick={() => setOpen(false)}>Cancel</Button></div></form></Card>}{loading ? <Empty>Loading suggestions...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <Card>{visible.length ? visible.map(item => <div className="list-row suggestion" key={item.id}><Lightbulb size={16} className="accent"/><div><strong>{item.title}</strong><p>{item.summary}</p><small>{item.category} - {item.confidence} confidence - {item.urgency} urgency</small></div><div className="actions"><Status text={item.status}/>{!['dismissed', 'acted'].includes(item.status) && <><Button kind="quiet" onClick={() => ask(item)}>Ask Brain</Button><Button kind="quiet" onClick={() => status(item.id, 'saved')}>Save</Button><Button kind="quiet" onClick={() => status(item.id, 'acted')}>Mark acted</Button><Button kind="quiet" onClick={() => status(item.id, 'dismissed')}>Dismiss</Button></>}</div></div>) : <Empty>No suggestions in this view yet.</Empty>}</Card>}</Page> }

function Apps() { const { data, error, loading, reload } = useLoad<Any[]>('/api/apps'); const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [status, setStatus] = useState('all'); const [sort, setSort] = useState('recent'); const [form, setForm] = useState({ name: '', url: '', description: '' }); const create = async (event: FormEvent) => { event.preventDefault(); await api.post('/api/apps', form); setForm({ name:'', url:'', description:'' }); setOpen(false); reload() }; const patch = async (id: string, value: Any) => { await api.patch(`/api/apps/${id}`, value); reload() }; const check = async (id: string) => { await api.post(`/api/apps/${id}/health-check`); reload() }; const remove = async (id: string) => { if (window.confirm('Remove this app from AgentGate?')) { await api.del(`/api/apps/${id}`); reload() } }; const visible = (data || []).filter(app => JSON.stringify(app).toLowerCase().includes(query.toLowerCase()) && (status === 'all' || app.status === status)).sort((left, right) => sort === 'name' ? String(left.name).localeCompare(String(right.name)) : new Date(right.updated_at || right.created_at || 0).getTime() - new Date(left.updated_at || left.created_at || 0).getTime()); return <Page title="Apps" note="Your personal apps and services." actions={<Button onClick={() => setOpen(true)}><Plus size={15}/>Add app</Button>}><div className="toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search apps"/><select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter apps"><option value="all">All states</option><option value="healthy">Healthy</option><option value="available">Available</option><option value="offline">Offline</option></select><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort apps"><option value="recent">Recent</option><option value="name">Name</option></select></div>{open && <Card className="form-card"><form onSubmit={create}><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="App name" required/><input value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https:// or http:// URL" required/><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What is this for?"/><div className="actions"><Button type="submit">Register app</Button><Button kind="quiet" onClick={()=>setOpen(false)}>Cancel</Button></div></form></Card>}{loading ? <Empty>Loading apps...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <div className="app-grid">{visible.length ? visible.map(app => <Card key={app.id} className="app-card"><AppWindow size={19} className="accent"/><strong>{app.name}</strong><p>{app.description || 'Personal app'}</p><small>{app.source || 'manual'} - {app.url}</small><Status text={app.status || 'unknown'} tone={app.status === 'healthy' ? 'good' : 'muted'}/><div className="actions"><a className="button primary" href={app.url} target="_blank" rel="noreferrer">Open <ExternalLink size={14}/></a><Button kind="quiet" onClick={() => patch(app.id, { pinned: !app.pinned })}>{app.pinned ? 'Unpin' : 'Pin'}</Button><Button kind="quiet" onClick={() => check(app.id)}>Check</Button><Button kind="quiet" onClick={() => remove(app.id)}><Trash2 size={14}/></Button></div></Card>) : <Empty>No apps match these controls.</Empty>}</div>}</Page> }

function ToolGate() { const { data, error, loading, reload } = useLoad<Any>('/api/gates/toolgate'); return <Page title="ToolGate" note="The control plane for brain actions." actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14}/>Refresh</Button>}>{loading ? <Empty>Loading ToolGate...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <><div className="health-grid"><Card><div className="metric-label">Status</div><strong>{data?.status?.lockdown ? 'Lockdown' : 'Online'}</strong><Status tone={data?.status?.lockdown ? 'danger' : 'good'} text={data?.status?.lockdown ? 'Execution blocked' : 'Ready'} /></Card><Card><div className="metric-label">Tools</div><strong>{data?.tools?.length || 0}</strong></Card><Card><div className="metric-label">Automations</div><strong>{data?.automations?.length || 0}</strong></Card><Card><div className="metric-label">Services</div><strong>{data?.services?.length || 0}</strong></Card></div><Card><h2>Available capabilities</h2>{data?.tools?.slice(0, 12).map((tool: Any) => <div className="list-row" key={tool.id}><Wrench size={15}/><div><strong>{tool.name || tool.id}</strong><p>{tool.description}</p></div><Status text={tool.authorization || tool.status} /></div>)}</Card></>}</Page> }

function Memory() { const { data, error, loading, reload } = useLoad<Any>('/api/gates/memorygate'); const [query, setQuery] = useState(''); const [results, setResults] = useState<Any[]>([]); const [searchError, setSearchError] = useState(''); const search = async (event: FormEvent) => { event.preventDefault(); if (!query.trim()) return; setSearchError(''); try { const value:any = await api.post('/api/gates/memorygate/search', { query, limit: 10 }); setResults(Array.isArray(value) ? value : value.items || value.memories || value.results || []) } catch (err) { setSearchError(err instanceof Error ? err.message : 'Search failed') } }; return <Page title="Memory" note="Search MemoryGate and jump to the skill editor." actions={<><a className="button primary" href={`${window.location.protocol}//${window.location.hostname}:8020/skills`} target="_blank" rel="noreferrer">Skill editor <ExternalLink size={14}/></a><Button kind="quiet" onClick={reload}><RefreshCw size={14}/>Refresh</Button></>}>{loading ? <Empty>Loading memory...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <><form className="toolbar" onSubmit={search}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search remembered context"/><Button type="submit">Search</Button></form>{searchError && <ErrorBox value={searchError}/>} {results.length ? <Card>{results.map((item:Any,index:number)=><div className="list-row" key={item.id || index}><Brain size={15} className="accent"/><div><strong>{item.title || item.memory_type || item.kind || 'Memory'}</strong><p>{item.content || item.summary || item.text || JSON.stringify(item)}</p></div></div>)}</Card> : <div className="memory-grid"><Card><h2>Recent memories</h2>{data?.memories?.slice(0,12).map((item:Any,index:number)=><div className="list-row" key={item.id || index}><Brain size={15}/><div><strong>{item.title || item.memory_type || 'Memory'}</strong><p>{item.content || item.summary || item.text || ''}</p></div></div>) || <Empty>No recent memories.</Empty>}</Card><Card><h2>Current briefing</h2><pre className="json-view">{JSON.stringify(data?.briefing, null, 2)}</pre></Card><Card><h2>Active patterns</h2>{data?.patterns?.slice(0,8).map((item:Any,index:number)=><div className="list-row" key={item.id || index}><Sparkles size={15}/><div><strong>{item.pattern_name || item.name || 'Pattern'}</strong><p>{item.description || item.summary || ''}</p></div></div>) || <Empty>No active patterns.</Empty>}</Card></div>}</>}</Page> }

function Automations() { const { data, error, loading, reload } = useLoad<any>('/api/automations'); const blank = { name:'', schedule:'0 9 * * *', prompt:'', deliver:'local' }; const [open, setOpen] = useState(false); const [editing, setEditing] = useState(''); const [form, setForm] = useState(blank); const rows = data?.jobs || []; const toolgateRows = data?.toolgate_automations || []; const close = () => { setOpen(false); setEditing(''); setForm(blank) }; const save = async (event: FormEvent) => { event.preventDefault(); if (editing) await api.patch(`/api/cron/jobs/${editing}`, form); else await api.post('/api/cron/jobs', form); close(); reload() }; const edit = (job: Any) => { setEditing(job.id || job.job_id); setForm({ name: job.name || '', schedule: job.schedule || '', prompt: job.prompt || '', deliver: job.deliver || job.delivery || 'local' }); setOpen(true) }; const action = async (id: string, name: string) => { await api.post(`/api/cron/jobs/${id}/${name}`); reload() }; const remove = async (id: string) => { if (window.confirm('Delete this brain cron job?')) { await api.del(`/api/cron/jobs/${id}`); reload() } }; return <Page title="Automations" note="Brain cron jobs plus read-only ToolGate automations." actions={<Button onClick={()=>{ close(); setOpen(true) }}><Plus size={15}/>New job</Button>}>{open && <Card className="form-card"><form onSubmit={save}><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Job name" required/><input value={form.schedule} onChange={e=>setForm({...form,schedule:e.target.value})} placeholder="Schedule" required/><textarea value={form.prompt} onChange={e=>setForm({...form,prompt:e.target.value})} placeholder="What should Brain do?" required/><input value={form.deliver} onChange={e=>setForm({...form,deliver:e.target.value})} placeholder="Delivery target"/><div className="actions"><Button type="submit">{editing ? 'Save job' : 'Create job'}</Button><Button kind="quiet" onClick={close}>Cancel</Button></div></form></Card>}{loading ? <Empty>Loading automations...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <><Card><h2>Brain cron jobs</h2>{rows.length ? rows.map((job: Any) => { const id = job.id || job.job_id; return <div className="verification" key={id}><div><strong>{job.name || 'Unnamed job'}</strong><p>{job.prompt}</p><small>{job.schedule} - next {job.next_run_at || 'unknown'} - {job.last_run_at ? `last ${job.last_run_at}` : 'not run yet'}</small></div><div className="actions"><Button kind="quiet" onClick={() => edit(job)}>Edit</Button><Button kind="quiet" onClick={() => action(id, job.paused ? 'resume' : 'pause')}>{job.paused ? 'Resume' : 'Pause'}</Button><Button kind="quiet" onClick={() => action(id, 'run')}>Run now</Button><Button kind="quiet" onClick={() => remove(id)}><Trash2 size={14}/></Button></div></div> }) : <Empty>No scheduled jobs yet.</Empty>}</Card><Card><h2>ToolGate automations</h2>{toolgateRows.length ? toolgateRows.map((item: Any) => <div className="list-row" key={item.id || item.name}><Wrench size={15}/><div><strong>{item.name || item.id || 'Automation'}</strong><p>{item.description || item.summary || 'Read-only ToolGate automation.'}</p><small>last {item.last_run_at || item.last_run || 'unknown'} - next {item.next_run_at || item.next_run || 'unknown'}</small></div><Status text={item.status || 'unknown'} /></div>) : <Empty>No ToolGate automations found.</Empty>}</Card></>}</Page> }

function System() { const { data, error, loading, reload } = useLoad<Any>('/api/system'); const vitals = data?.vitals || {}; const containers = data?.containers?.results || []; const backup = data?.backups?.latest; return <Page title="System" note="Read-only host and container status from SystemGate." actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14}/>Refresh</Button>}>{loading ? <Empty>Loading system status...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <><div className="health-grid"><Card><div className="metric-label">CPU</div><strong><code>{vitals.cpu_percent ?? 'n/a'}%</code></strong><Status text={`${vitals.cpu_count || 0} cores`} /></Card><Card><div className="metric-label">Memory</div><strong><code>{vitals.memory?.percent ?? 'n/a'}%</code></strong><Status text={`${vitals.memory?.available ?? 'unknown'} free`} /></Card><Card><div className="metric-label">Disk</div><strong><code>{vitals.disk?.percent ?? 'n/a'}%</code></strong><Status text={`${vitals.disk?.free ?? 'unknown'} free`} /></Card><Card><div className="metric-label">Latest backup</div><strong><code>{backup?.name || 'none'}</code></strong><Status text={backup ? 'available' : 'missing'} tone={backup ? 'good' : 'danger'} /></Card></div><Card><h2>Containers</h2>{containers.length ? containers.map((item: Any) => <div className="list-row" key={item.id || item.name}><HeartPulse size={15}/><div><strong>{item.name}</strong><p>{item.image}</p><small><code>{item.id}</code></small></div><Status text={item.status} tone={item.status === 'running' ? 'good' : 'muted'} /></div>) : <Empty>No containers reported.</Empty>}</Card></>}</Page> }

function Character() { const { data, error, loading, reload } = useLoad<Any>('/api/character'); const [form, setForm] = useState<Any | null>(null); useEffect(() => { if (data) setForm(data) }, [data]); const save = async (event: FormEvent) => { event.preventDefault(); await api.put('/api/character', form); reload() }; if (loading || !form) return <Page title="Character"><Empty>Loading character...</Empty></Page>; return <Page title="Character" note="One durable brain identity.">{error && <ErrorBox value={error} retry={reload}/>}<Card className="form-card character"><form onSubmit={save}><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>How Brain calls you<input value={form.owner_name} onChange={e=>setForm({...form,owner_name:e.target.value})}/></label><label>Avatar URL<input value={form.avatar_url || ''} onChange={e=>setForm({...form,avatar_url:e.target.value})} placeholder="Optional image URL"/></label><label>Personality<textarea value={form.personality} onChange={e=>setForm({...form,personality:e.target.value})}/></label><label>Background<textarea value={form.background} onChange={e=>setForm({...form,background:e.target.value})}/></label><label>Speaking style<textarea value={form.speaking_style} onChange={e=>setForm({...form,speaking_style:e.target.value})}/></label><label>Boundaries<textarea value={form.boundaries} onChange={e=>setForm({...form,boundaries:e.target.value})}/></label><Button type="submit"><Check size={15}/>Save character</Button></form></Card><Card><strong>Character context preview</strong><p>This local context is saved by AgentGate. Brain-wide SOUL synchronization is intentionally not enabled in this MVP.</p><pre className="context-preview">{form.context_preview}</pre></Card></Page> }

function App() {
  const [ready, setReady] = useState<boolean | null>(null)
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme())
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { api.get('/api/auth/session').then(()=>setReady(true)).catch(()=>setReady(false)) }, [])
  const toggleTheme = () => setTheme(current => current === 'light' ? 'dark' : 'light')
  if (ready === null) return <div className="splash">Loading AgentGate...</div>
  return <Theme accentColor="blue" appearance={theme} grayColor="slate" radius="large" scaling="100%"><BrowserRouter>{ready ? <Shell theme={theme} toggleTheme={toggleTheme} /> : <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>}</BrowserRouter><Toaster position="top-right" richColors theme={theme} /></Theme>
}
export default App
