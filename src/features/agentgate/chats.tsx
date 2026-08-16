import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, MessageSquare, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from './page-header'
import { getAgentGate, relativeTime, type ChatSession } from './api'

export function ChatsPage() {
  const [search, setSearch] = useState('')
  const chats = useQuery({ queryKey: ['agentgate', 'chats'], queryFn: () => getAgentGate<{ sessions: ChatSession[] }>('/api/chats') })
  const rows = useMemo(() => (chats.data?.sessions ?? []).filter((item) => `${item.title} ${item.preview}`.toLowerCase().includes(search.toLowerCase())), [chats.data, search])
  return <><AgentGateHeader /><Main><div className='mb-6 flex items-center justify-between gap-4'><div><h1 className='text-2xl font-bold tracking-tight'>Chats</h1><p className='text-sm text-muted-foreground'>Start a new conversation or continue a recent session.</p></div><Button><Plus />New chat</Button></div><Card><CardHeader className='flex flex-row items-center justify-between space-y-0'><div><CardTitle>Recent sessions</CardTitle><CardDescription className='mt-1'>Your private conversation history, ordered by latest activity.</CardDescription></div><MessageSquare className='size-5 text-muted-foreground' /></CardHeader><CardContent><div className='mb-4 flex items-center gap-2'><Search className='size-4 text-muted-foreground' /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search sessions' /></div><Table><TableHeader><TableRow><TableHead>Session</TableHead><TableHead>Last message</TableHead><TableHead>Updated</TableHead><TableHead className='w-10' /></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className='font-medium'>{row.title}</TableCell><TableCell className='max-w-md truncate text-muted-foreground'>{row.preview}</TableCell><TableCell><code className='font-mono text-xs text-muted-foreground'>{relativeTime(row.updated_at)}</code></TableCell><TableCell><Button variant='ghost' size='icon' aria-label={`Open ${row.title}`}><ArrowUpRight /></Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></Main></>
}
