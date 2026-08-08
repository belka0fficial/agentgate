import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Activity, AppWindow, Bot, Brain, Check, ChevronRight, Clock3, Command, Copy, ExternalLink, Gauge, HeartPulse, History, Lightbulb, LogOut, Menu, MessageSquare, Plus, RefreshCw, RotateCcw, Search, Send, ShieldCheck, Sparkles, Square, Trash2, Volume2, Wrench, X } from 'lucide-react'
import { api, ApiError, csrfHeaders } from './api'

type Any = Record<string, any>
const nav = [
  { to: '/', label: 'Home', icon: Gauge }, { to: '/chats', label: 'Chats', icon: MessageSquare },
  { to: '/verifications', label: 'Verifications', icon: ShieldCheck }, { to: '/suggestions', label: 'Suggestions', icon: Lightbulb },
  { to: '/apps', label: 'Apps', icon: AppWindow },
]
const gates = [{ to: '/gates/toolgate', label: 'ToolGate', icon: Wrench }, { to: '/gates/memorygate', label: 'MemoryGate', icon: Brain }]

function useLoad<T>(path: string, enabled = true) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(enabled)
  const load = async () => { if (!enabled) return; setLoading(true); setError(''); try { setData(await api.get<T>(path)) } catch (err) { setError(err instanceof Error ? err.message : 'Unable to load') } finally { setLoading(false) } }
  useEffect(() => { load() }, [path, enabled])
  return { data, error, loading, reload: load, setData }
}

function Status({ text, tone = 'muted' }: { text: string, tone?: string }) { return <span className={`status ${tone}`}>{text}</span> }
function Card({ children, className = '' }: { children: ReactNode, className?: string }) { return <section className={`card ${className}`}>{children}</section> }
function Page({ title, note, actions, children }: { title: string, note?: string, actions?: ReactNode, children: ReactNode }) { return <div className="page"><header className="page-head"><div><h1>{title}</h1>{note && <p>{note}</p>}</div><div className="actions">{actions}</div></header>{children}</div> }
function Button({ children, onClick, kind = 'primary', disabled = false, type = 'button' }: { children: ReactNode, onClick?: () => void, kind?: 'primary' | 'quiet' | 'danger', disabled?: boolean, type?: 'button' | 'submit' }) { return <button type={type} disabled={disabled} onClick={onClick} className={`button ${kind}`}>{children}</button> }
function Empty({ children }: { children: ReactNode }) { return <div className="empty">{children}</div> }
function ErrorBox({ value, retry }: { value: string, retry?: () => void }) { return <div className="error"><span>{value}</span>{retry && <Button kind="quiet" onClick={retry}>Retry</Button>}</div> }

function Sidebar({ mobile, close }: { mobile?: boolean, close?: () => void }) {
  const navigate = useNavigate()
  const logout = async () => { await api.post('/api/auth/logout'); navigate('/login') }
  const items = (list: typeof nav) => list.map(({ to, label, icon: Icon }) => <NavLink onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to={to} key={to}><Icon size={16} />{label}</NavLink>)
  return <aside className={mobile ? 'drawer' : 'sidebar'}><div className="brand"><span className="brand-mark"><Command size={19} /></span><span>AgentGate</span>{mobile && <button className="icon-button" onClick={close}><X size={18} /></button>}</div><nav>{items(nav)}<div className="nav-label">Gates</div>{items(gates)}<NavLink onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/cron"><Clock3 size={16} />Cron Jobs</NavLink><div className="nav-label">Settings</div><NavLink onClick={close} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to="/settings/character"><Bot size={16} />Character</NavLink></nav><div className="sidebar-footer"><span><i className="dot" />AgentGate local</span><button className="logout" onClick={logout}><LogOut size={14} />Sign out</button></div></aside>
}

function Shell() { const [open, setOpen] = useState(false); return <div className="shell"><Sidebar /><button className="mobile-menu" onClick={() => setOpen(true)}><Menu size={20} /></button>{open && <div className="drawer-wrap"><div className="backdrop" onClick={() => setOpen(false)} /><Sidebar mobile close={() => setOpen(false)} /></div>}<main><Routes><Route path="/" element={<Home />} /><Route path="/chats" element={<ChatList />} /><Route path="/chats/:id" element={<Chat />} /><Route path="/verifications" element={<Verifications />} /><Route path="/suggestions" element={<Suggestions />} /><Route path="/apps" element={<Apps />} /><Route path="/gates/toolgate" element={<ToolGate />} /><Route path="/gates/memorygate" element={<MemoryGate />} /><Route path="/cron" element={<Cron />} /><Route path="/settings/character" element={<Character />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></main></div> }

function Login() { const navigate = useNavigate(); const [key, setKey] = useState(''); const [error, setError] = useState(''); const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); try { await api.post('/api/auth/login', { key }); navigate('/') } catch { setError('Invalid key') } }; return <div className="login"><form onSubmit={submit} className="login-card"><div className="brand"><span className="brand-mark"><Command size={19} /></span>AgentGate</div><h1>Your personal Hermes dashboard</h1><p>Enter the local owner key configured for AgentGate.</p><input autoFocus type="password" value={key} onChange={e => setKey(e.target.value)} placeholder="Owner key" /><Button type="submit" disabled={!key}>Open AgentGate</Button>{error && <ErrorBox value={error} />}</form></div> }

function Home() { const { data, error, loading, reload } = useLoad<Any>('/api/home'); if (loading) return <Page title="Home"><Empty>Loading your command center...</Empty></Page>; if (error) return <Page title="Home" actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14} />Refresh</Button>}><ErrorBox value={error} retry={reload} /></Page>; const health = data?.health || {}; return <Page title="Home" note="A quiet view of what needs your attention." actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14} />Refresh</Button>}><div className="health-grid">{['hermes','toolgate','memorygate'].map(name => <Card key={name}><div className="metric-label">{name}</div><strong>{health[name]?.error ? 'Offline' : 'Online'}</strong><Status tone={health[name]?.error ? 'danger' : 'good'} text={health[name]?.error ? 'Needs connection' : 'Connected'} /></Card>)}</div><section className="home-section"><h2>Pinned apps</h2>{data?.pinned_apps?.length ? <div className="app-grid">{data.pinned_apps.map((app: Any) => <a className="app-tile" key={app.id} href={app.url} target="_blank" rel="noreferrer"><AppWindow size={18}/><span>{app.name}</span><ExternalLink size={14}/></a>)}</div> : <Card><Empty>Pin your favorite apps here from Apps.</Empty></Card>}</section>{data?.pending_verifications?.length ? <section className="home-section"><h2>Needs verification</h2><Card>{data.pending_verifications.slice(0,3).map((item:Any)=><div className="list-row" key={`${item.source}-${item.source_id || item.id}`}><ShieldCheck size={16} className="accent"/><div><strong>{item.title || item.summary?.title || 'Approval required'}</strong><p>{item.details || 'Hermes is waiting for your decision.'}</p></div><Status text={item.source}/></div>)}</Card></section> : null}<section className="home-section"><h2>New suggestions</h2>{data?.suggestions?.length ? <Card>{data.suggestions.map((item: Any) => <div className="list-row" key={item.id}><Lightbulb size={16} className="accent"/><div><strong>{item.title}</strong><p>{item.summary}</p></div><Status text={item.confidence} /></div>)}</Card> : <Card><Empty>Hermes has not sent any suggestions yet.</Empty></Card>}</section></Page> }

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
  return <Page title="Chats" note="Your Hermes conversations." actions={<Button onClick={create}><Plus size={15}/>New chat</Button>}><div className="toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search chats"/><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter chats"><option value="all">All</option><option value="active">Active</option><option value="archived">Archived</option><option value="forked">Forked</option><option value="incognito">Incognito</option></select><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort chats"><option value="recent">Recent</option><option value="oldest">Oldest</option><option value="title">Title</option></select><Button kind="quiet" onClick={reload}><RefreshCw size={14}/></Button></div>{loading ? <Empty>Loading chats...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <Card>{visible.length ? visible.map((row: Any) => { const id = row.id || row.session_id; return <div className="chat-row" key={id}><button className="chat-open" onClick={() => navigate(`/chats/${id}`)}><MessageSquare size={17}/><div><strong>{row.title || 'Untitled chat'}</strong><p>{row.preview || row.last_message || row.source || 'Hermes conversation'}</p><small>{row.model || row.provider || row.source || 'Hermes'} {row.parent_id || row.parent_session_id ? '- fork' : ''}</small></div><span>{row.updated_at ? new Date(row.updated_at).toLocaleDateString() : ''}</span><ChevronRight size={16}/></button><div className="chat-actions"><Button kind="quiet" onClick={() => rename(row)}>Rename</Button><Button kind="quiet" onClick={() => remove(row)}><Trash2 size={14}/></Button></div></div> }) : <Empty>No chats match these controls.</Empty>}</Card>}</Page>
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
      setDraft(`Error: ${err instanceof Error ? err.message : 'Unable to stream response'}`)
    } finally {
      setStreaming(false)
    }
  }

  const rows = Array.isArray(messages.data) ? messages.data : messages.data?.messages || []
  const fork = async () => {
    const item: any = await api.post(`/api/chats/${id}/fork`, { title: 'Forked chat' })
    navigate(`/chats/${item.id || item.session_id}`)
  }
  const retry = () => { if (lastPrompt && !streaming) { setInput(lastPrompt) } }
  const stop = async () => { if (runId) { await api.post(`/api/runs/${runId}/stop`); setStreaming(false) } }
  const copy = async (value: string) => { await navigator.clipboard?.writeText(value) }
  const speak = (value: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(value)) } }

  return <Page title="Chat" note="Hermes is connected through its native session API." actions={<>
    <input className="chat-control" value={provider} onChange={e => setProvider(e.target.value)} placeholder="Provider" aria-label="Provider" />
    <input className="chat-control" value={model} onChange={e => setModel(e.target.value)} placeholder="Model" aria-label="Model" />
    <select className="chat-control" value={intensity} onChange={e => setIntensity(e.target.value)} aria-label="Reasoning intensity"><option value="light">Light</option><option value="medium">Medium</option><option value="high">High</option><option value="very_high">Very high</option></select>
    <label className="toggle"><input type="checkbox" checked={incognito} onChange={e => setIncognito(e.target.checked)} />Memory incognito</label>
    {streaming && runId && <Button kind="danger" onClick={stop}><Square size={14} />Stop</Button>}
    {lastPrompt && <Button kind="quiet" onClick={retry}><RotateCcw size={14} />Retry</Button>}
    <Button kind="quiet" onClick={fork}><History size={14} />Fork</Button>
  </>}>
    <div className="chat-workspace">
      <Card className="messages">
        {messages.loading ? <Empty>Loading conversation...</Empty> : messages.error ? <ErrorBox value={messages.error} retry={messages.reload} /> : <>
          {rows.map((message: Any, index: number) => <article className={`message ${message.role === 'user' ? 'user' : 'assistant'}`} key={message.id || index}><span>{message.role === 'user' ? 'You' : 'Hermes'}</span><div>{messageText(message)}</div></article>)}
          {toolEvents.length > 0 && <div className="tool-events">{toolEvents.map((item, index) => <div key={`${item}-${index}`}><Activity size={13} />{item}</div>)}</div>}
          {draft && <article className="message assistant"><span>Hermes <button className="message-action" onClick={() => copy(draft)}><Copy size={13} /></button><button className="message-action" onClick={() => speak(draft)}><Volume2 size={13} /></button></span><div>{draft || 'Thinking...'}</div></article>}
        </>}
      </Card>
      <form className="composer" onSubmit={send}>
        <textarea value={input} onChange={e => setInput(e.target.value)} placeholder="Message Hermes" rows={3} />
        <Button type="submit" disabled={!input.trim() || streaming}>{streaming ? <Activity size={15} /> : <Send size={15} />} {streaming ? 'Working' : 'Send'}</Button>
      </form>
    </div>
  </Page>
}

function Verifications() { const { data, error, loading, reload } = useLoad<Any[]>('/api/verifications'); const [view, setView] = useState('pending'); const [source, setSource] = useState('all'); const decide = async (item: Any, status: string) => { if (status === 'approved' && ['warning', 'high', 'critical'].includes(String(item.severity).toLowerCase()) && !window.confirm('This is a higher-risk action. Approve only if the action and arguments are correct.')) return; try { const path = item.source === 'hermes' ? `/api/verifications/hermes/${item.source_id}/decision` : `/api/verifications/toolgate/${item.source_id}/decision`; await api.post(path, item.source === 'hermes' ? { decision: status } : { status }); reload() } catch (err) { alert(err instanceof Error ? err.message : 'Unable to decide') } }; const visible = (data || []).filter(item => (view === 'pending' ? item.status === 'pending' : item.status !== 'pending') && (source === 'all' || item.source === source)); return <Page title="Verifications" note="Owner decisions from Hermes and ToolGate." actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14}/>Refresh</Button>}><div className="toolbar"><select value={view} onChange={e=>setView(e.target.value)} aria-label="Verification status"><option value="pending">Pending</option><option value="history">History</option></select><select value={source} onChange={e=>setSource(e.target.value)} aria-label="Verification source"><option value="all">All sources</option><option value="hermes">Hermes</option><option value="toolgate">ToolGate</option></select></div>{loading ? <Empty>Loading approvals...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <Card>{visible.length ? visible.map((item: Any) => <div className="verification" key={`${item.source}-${item.source_id || item.id}`}><div><div className="actions"><Status text={item.source || 'toolgate'} /><Status text={item.severity || 'normal'} tone={['high','critical','warning'].includes(String(item.severity).toLowerCase()) ? 'danger' : 'muted'} /></div><strong>{item.title}</strong><p>{item.details || 'Review this requested action before it continues.'}</p><small>{item.status} {item.actor ? `- ${item.actor}` : ''} {item.created_at ? `- ${new Date(item.created_at).toLocaleString()}` : ''} {item.expires_at ? `- expires ${new Date(item.expires_at).toLocaleString()}` : ''}</small><details className="verification-details"><summary>Action details</summary><pre className="json-view">{JSON.stringify(item.action || {}, null, 2)}</pre></details></div>{item.status === 'pending' && <div className="actions"><Button onClick={() => decide(item, 'approved')}><Check size={14}/>Approve</Button><Button kind="danger" onClick={() => decide(item, 'rejected')}>Reject</Button></div>}</div>) : <Empty>{view === 'pending' ? 'Nothing needs your approval.' : 'No completed approvals yet.'}</Empty>}</Card>}</Page> }

function Suggestions() { const navigate = useNavigate(); const { data, error, loading, reload } = useLoad<Any[]>('/api/suggestions'); const [open, setOpen] = useState(false); const [view, setView] = useState('new'); const [title, setTitle] = useState(''); const [summary, setSummary] = useState(''); const create = async (event: FormEvent) => { event.preventDefault(); await api.post('/api/suggestions', { title, summary }); setTitle(''); setSummary(''); setOpen(false); reload() }; const status = async (id: string, value: string) => { await api.patch(`/api/suggestions/${id}`, { status: value }); reload() }; const ask = async (item: Any) => { const session: Any = await api.post('/api/chats', { title: `Suggestion: ${item.title}` }); const id = session.id || session.session_id; navigate(`/chats/${id}?prompt=${encodeURIComponent(`Help me evaluate this suggestion:\n\n${item.title}\n${item.summary}`)}`) }; const visible = (data || []).filter(item => view === 'all' || item.status === view); return <Page title="Suggestions" note="Ideas from Hermes and from you." actions={<Button onClick={() => setOpen(true)}><Plus size={15}/>Add</Button>}><div className="toolbar"><select value={view} onChange={e=>setView(e.target.value)} aria-label="Suggestion status"><option value="new">New</option><option value="saved">Saved</option><option value="acted">Acted</option><option value="dismissed">Dismissed</option><option value="all">All</option></select></div>{open && <Card className="form-card"><form onSubmit={create}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Suggestion title" required/><textarea value={summary} onChange={e=>setSummary(e.target.value)} placeholder="Why does this matter?" required/><div className="actions"><Button type="submit">Save</Button><Button kind="quiet" onClick={() => setOpen(false)}>Cancel</Button></div></form></Card>}{loading ? <Empty>Loading suggestions...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <Card>{visible.length ? visible.map(item => <div className="list-row suggestion" key={item.id}><Lightbulb size={16} className="accent"/><div><strong>{item.title}</strong><p>{item.summary}</p><small>{item.category} - {item.confidence} confidence - {item.urgency} urgency</small></div><div className="actions"><Status text={item.status}/>{!['dismissed', 'acted'].includes(item.status) && <><Button kind="quiet" onClick={() => ask(item)}>Ask Hermes</Button><Button kind="quiet" onClick={() => status(item.id, 'saved')}>Save</Button><Button kind="quiet" onClick={() => status(item.id, 'acted')}>Mark acted</Button><Button kind="quiet" onClick={() => status(item.id, 'dismissed')}>Dismiss</Button></>}</div></div>) : <Empty>No suggestions in this view yet.</Empty>}</Card>}</Page> }

function Apps() { const { data, error, loading, reload } = useLoad<Any[]>('/api/apps'); const [open, setOpen] = useState(false); const [query, setQuery] = useState(''); const [status, setStatus] = useState('all'); const [sort, setSort] = useState('recent'); const [form, setForm] = useState({ name: '', url: '', description: '' }); const create = async (event: FormEvent) => { event.preventDefault(); await api.post('/api/apps', form); setForm({ name:'', url:'', description:'' }); setOpen(false); reload() }; const patch = async (id: string, value: Any) => { await api.patch(`/api/apps/${id}`, value); reload() }; const check = async (id: string) => { await api.post(`/api/apps/${id}/health-check`); reload() }; const remove = async (id: string) => { if (window.confirm('Remove this app from AgentGate?')) { await api.del(`/api/apps/${id}`); reload() } }; const visible = (data || []).filter(app => JSON.stringify(app).toLowerCase().includes(query.toLowerCase()) && (status === 'all' || app.status === status)).sort((left, right) => sort === 'name' ? String(left.name).localeCompare(String(right.name)) : new Date(right.updated_at || right.created_at || 0).getTime() - new Date(left.updated_at || left.created_at || 0).getTime()); return <Page title="Apps" note="Your personal apps and services." actions={<Button onClick={() => setOpen(true)}><Plus size={15}/>Add app</Button>}><div className="toolbar"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search apps"/><select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter apps"><option value="all">All states</option><option value="healthy">Healthy</option><option value="available">Available</option><option value="offline">Offline</option></select><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort apps"><option value="recent">Recent</option><option value="name">Name</option></select></div>{open && <Card className="form-card"><form onSubmit={create}><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="App name" required/><input value={form.url} onChange={e=>setForm({...form,url:e.target.value})} placeholder="https:// or http:// URL" required/><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="What is this for?"/><div className="actions"><Button type="submit">Register app</Button><Button kind="quiet" onClick={()=>setOpen(false)}>Cancel</Button></div></form></Card>}{loading ? <Empty>Loading apps...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <div className="app-grid">{visible.length ? visible.map(app => <Card key={app.id} className="app-card"><AppWindow size={19} className="accent"/><strong>{app.name}</strong><p>{app.description || 'Personal app'}</p><small>{app.source || 'manual'} - {app.url}</small><Status text={app.status || 'unknown'} tone={app.status === 'healthy' ? 'good' : 'muted'}/><div className="actions"><a className="button primary" href={app.url} target="_blank" rel="noreferrer">Open <ExternalLink size={14}/></a><Button kind="quiet" onClick={() => patch(app.id, { pinned: !app.pinned })}>{app.pinned ? 'Unpin' : 'Pin'}</Button><Button kind="quiet" onClick={() => check(app.id)}>Check</Button><Button kind="quiet" onClick={() => remove(app.id)}><Trash2 size={14}/></Button></div></Card>) : <Empty>No apps match these controls.</Empty>}</div>}</Page> }

function ToolGate() { const { data, error, loading, reload } = useLoad<Any>('/api/gates/toolgate'); return <Page title="ToolGate" note="The control plane for Hermes actions." actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14}/>Refresh</Button>}>{loading ? <Empty>Loading ToolGate...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <><div className="health-grid"><Card><div className="metric-label">Status</div><strong>{data?.status?.lockdown ? 'Lockdown' : 'Online'}</strong><Status tone={data?.status?.lockdown ? 'danger' : 'good'} text={data?.status?.lockdown ? 'Execution blocked' : 'Ready'} /></Card><Card><div className="metric-label">Tools</div><strong>{data?.tools?.length || 0}</strong></Card><Card><div className="metric-label">Automations</div><strong>{data?.automations?.length || 0}</strong></Card><Card><div className="metric-label">Services</div><strong>{data?.services?.length || 0}</strong></Card></div><Card><h2>Available capabilities</h2>{data?.tools?.slice(0, 12).map((tool: Any) => <div className="list-row" key={tool.id}><Wrench size={15}/><div><strong>{tool.name || tool.id}</strong><p>{tool.description}</p></div><Status text={tool.authorization || tool.status} /></div>)}</Card></>}</Page> }

function MemoryGate() { const { data, error, loading, reload } = useLoad<Any>('/api/gates/memorygate'); const [query, setQuery] = useState(''); const [results, setResults] = useState<Any[]>([]); const [searchError, setSearchError] = useState(''); const search = async (event: FormEvent) => { event.preventDefault(); if (!query.trim()) return; setSearchError(''); try { const value:any = await api.post('/api/gates/memorygate/search', { query, limit: 10 }); setResults(Array.isArray(value) ? value : value.items || value.memories || []) } catch (err) { setSearchError(err instanceof Error ? err.message : 'Search failed') } }; return <Page title="MemoryGate" note="The evidence-backed memory system behind Hermes." actions={<Button kind="quiet" onClick={reload}><RefreshCw size={14}/>Refresh</Button>}>{loading ? <Empty>Loading MemoryGate...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <><form className="toolbar" onSubmit={search}><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search remembered context"/><Button type="submit">Search</Button></form>{searchError && <ErrorBox value={searchError}/>} {results.length ? <Card>{results.map((item:Any,index:number)=><div className="list-row" key={item.id || index}><Brain size={15} className="accent"/><div><strong>{item.title || item.memory_type || item.kind || 'Memory'}</strong><p>{item.content || item.summary || item.text || JSON.stringify(item)}</p></div></div>)}</Card> : <div className="memory-grid"><Card><h2>Current briefing</h2><pre className="json-view">{JSON.stringify(data?.briefing, null, 2)}</pre></Card><Card><h2>Recent memories</h2>{data?.memories?.slice(0,8).map((item:Any,index:number)=><div className="list-row" key={item.id || index}><Brain size={15}/><div><strong>{item.title || item.memory_type || 'Memory'}</strong><p>{item.content || item.summary || ''}</p></div></div>) || <Empty>No recent memories.</Empty>}</Card><Card><h2>Active patterns</h2>{data?.patterns?.slice(0,8).map((item:Any,index:number)=><div className="list-row" key={item.id || index}><Sparkles size={15}/><div><strong>{item.pattern_name || item.name || 'Pattern'}</strong><p>{item.description || item.summary || ''}</p></div></div>) || <Empty>No active patterns.</Empty>}</Card></div>}</>}</Page> }

function Cron() { const { data, error, loading, reload } = useLoad<any>('/api/cron/jobs'); const blank = { name:'', schedule:'0 9 * * *', prompt:'', deliver:'local' }; const [open, setOpen] = useState(false); const [editing, setEditing] = useState(''); const [form, setForm] = useState(blank); const rows = Array.isArray(data) ? data : data?.jobs || []; const close = () => { setOpen(false); setEditing(''); setForm(blank) }; const save = async (event: FormEvent) => { event.preventDefault(); if (editing) await api.patch(`/api/cron/jobs/${editing}`, form); else await api.post('/api/cron/jobs', form); close(); reload() }; const edit = (job: Any) => { setEditing(job.id || job.job_id); setForm({ name: job.name || '', schedule: job.schedule || '', prompt: job.prompt || '', deliver: job.deliver || job.delivery || 'local' }); setOpen(true) }; const action = async (id: string, name: string) => { await api.post(`/api/cron/jobs/${id}/${name}`); reload() }; const remove = async (id: string) => { if (window.confirm('Delete this Hermes cron job?')) { await api.del(`/api/cron/jobs/${id}`); reload() } }; return <Page title="Cron Jobs" note="Hermes scheduled intelligence." actions={<Button onClick={()=>{ close(); setOpen(true) }}><Plus size={15}/>New job</Button>}>{open && <Card className="form-card"><form onSubmit={save}><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Job name" required/><input value={form.schedule} onChange={e=>setForm({...form,schedule:e.target.value})} placeholder="Schedule" required/><textarea value={form.prompt} onChange={e=>setForm({...form,prompt:e.target.value})} placeholder="What should Hermes do?" required/><input value={form.deliver} onChange={e=>setForm({...form,deliver:e.target.value})} placeholder="Delivery target"/><div className="actions"><Button type="submit">{editing ? 'Save job' : 'Create job'}</Button><Button kind="quiet" onClick={close}>Cancel</Button></div></form></Card>}{loading ? <Empty>Loading jobs...</Empty> : error ? <ErrorBox value={error} retry={reload} /> : <Card>{rows.length ? rows.map((job: Any) => { const id = job.id || job.job_id; return <div className="verification" key={id}><div><strong>{job.name || 'Unnamed job'}</strong><p>{job.prompt}</p><small>{job.schedule} - next {job.next_run_at || 'unknown'} - {job.last_run_at ? `last ${job.last_run_at}` : 'not run yet'}</small></div><div className="actions"><Button kind="quiet" onClick={() => edit(job)}>Edit</Button><Button kind="quiet" onClick={() => action(id, job.paused ? 'resume' : 'pause')}>{job.paused ? 'Resume' : 'Pause'}</Button><Button kind="quiet" onClick={() => action(id, 'run')}>Run now</Button><Button kind="quiet" onClick={() => remove(id)}><Trash2 size={14}/></Button></div></div> }) : <Empty>No scheduled jobs yet.</Empty>}</Card>}</Page> }

function Character() { const { data, error, loading, reload } = useLoad<Any>('/api/character'); const [form, setForm] = useState<Any | null>(null); useEffect(() => { if (data) setForm(data) }, [data]); const save = async (event: FormEvent) => { event.preventDefault(); await api.put('/api/character', form); reload() }; if (loading || !form) return <Page title="Character"><Empty>Loading character...</Empty></Page>; return <Page title="Character" note="One durable Hermes identity.">{error && <ErrorBox value={error} retry={reload}/>}<Card className="form-card character"><form onSubmit={save}><label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>How Hermes calls you<input value={form.owner_name} onChange={e=>setForm({...form,owner_name:e.target.value})}/></label><label>Avatar URL<input value={form.avatar_url || ''} onChange={e=>setForm({...form,avatar_url:e.target.value})} placeholder="Optional image URL"/></label><label>Personality<textarea value={form.personality} onChange={e=>setForm({...form,personality:e.target.value})}/></label><label>Background<textarea value={form.background} onChange={e=>setForm({...form,background:e.target.value})}/></label><label>Speaking style<textarea value={form.speaking_style} onChange={e=>setForm({...form,speaking_style:e.target.value})}/></label><label>Boundaries<textarea value={form.boundaries} onChange={e=>setForm({...form,boundaries:e.target.value})}/></label><Button type="submit"><Check size={15}/>Save character</Button></form></Card><Card><strong>Character context preview</strong><p>This local context is saved by AgentGate. Hermes-wide SOUL synchronization is intentionally not enabled in this MVP.</p><pre className="context-preview">{form.context_preview}</pre></Card></Page> }

function App() { const [ready, setReady] = useState<boolean | null>(null); useEffect(() => { api.get('/api/auth/session').then(()=>setReady(true)).catch(()=>setReady(false)) }, []); if (ready === null) return <div className="splash">Loading AgentGate...</div>; return <BrowserRouter>{ready ? <Shell /> : <Routes><Route path="/login" element={<Login />} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes>}</BrowserRouter> }
export default App
