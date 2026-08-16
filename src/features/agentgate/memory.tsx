import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { getAgentGate, relativeTime } from './api'
import { AgentGateHeader } from './page-header'

type MemoryRecord = { id: string; title: string; kind: string; confidence: string; updated_at: string }
export function MemoryPage() {
  const [search, setSearch] = useState('')
  const query = useQuery({ queryKey: ['agentgate', 'memory'], queryFn: () => getAgentGate<{ memories: MemoryRecord[] }>('/api/gates/memorygate') })
  const records = useMemo(() => (query.data?.memories ?? []).filter((item) => `${item.title} ${item.kind}`.toLowerCase().includes(search.toLowerCase())), [query.data, search])
  return <><AgentGateHeader /><Main><div className='mb-6'><h1 className='text-2xl font-bold tracking-tight'>Memory</h1><p className='text-sm text-muted-foreground'>Durable context, evidence, and operational knowledge retained by MemoryGate.</p></div><Card><CardHeader><CardTitle>Stored context</CardTitle><CardDescription>Evidence-backed memories are available to the agent when relevant.</CardDescription></CardHeader><CardContent><div className='mb-4 flex items-center gap-2'><Search className='size-4 text-muted-foreground' /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder='Search memory' /><Button variant='outline'>Search</Button></div><Table><TableHeader><TableRow><TableHead>Memory</TableHead><TableHead>Kind</TableHead><TableHead>Confidence</TableHead><TableHead>Updated</TableHead><TableHead /></TableRow></TableHeader><TableBody>{records.map((item) => <TableRow key={item.id}><TableCell><p className='font-medium'>{item.title}</p><code className='font-mono text-xs text-muted-foreground'>{item.id}</code></TableCell><TableCell><Badge variant='outline'>{item.kind}</Badge></TableCell><TableCell><Badge variant={item.confidence === 'high' ? 'secondary' : 'outline'}>{item.confidence}</Badge></TableCell><TableCell><code className='font-mono text-xs'>{relativeTime(item.updated_at)}</code></TableCell><TableCell><Button variant='ghost' size='sm'>Inspect</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></Main></>
}
