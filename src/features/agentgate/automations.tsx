import { useQuery } from '@tanstack/react-query'
import { Pause, Play, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import { AgentGateHeader } from './page-header'

type Automation = { id: string; name: string; description: string; schedule: string; next: string; status: string; runs: number }
export function AutomationsPage() {
  const query = useQuery({ queryKey: ['agentgate', 'automations'], queryFn: () => getAgentGate<{ automations: Automation[] }>('/api/automations') })
  return <><AgentGateHeader /><Main><div className='mb-6 flex items-center justify-between gap-4'><div><h1 className='text-2xl font-bold tracking-tight'>Automations</h1><p className='text-sm text-muted-foreground'>Scheduled work that remains inside its reviewed policy.</p></div><Button><Plus />New automation</Button></div><Card><CardHeader><CardTitle>Automation runs</CardTitle><CardDescription>Each job reports its next execution without widening its own permissions.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Automation</TableHead><TableHead>Status</TableHead><TableHead>Schedule</TableHead><TableHead>Next run</TableHead><TableHead>Runs</TableHead><TableHead /></TableRow></TableHeader><TableBody>{(query.data?.automations ?? []).map((item) => <TableRow key={item.id}><TableCell><p className='font-medium'>{item.name}</p><p className='text-xs text-muted-foreground'>{item.description}</p></TableCell><TableCell><Badge variant={item.status === 'active' ? 'secondary' : 'outline'}>{item.status}</Badge></TableCell><TableCell><code className='font-mono text-xs'>{item.schedule}</code></TableCell><TableCell><code className='font-mono text-xs'>{item.next}</code></TableCell><TableCell><code className='font-mono text-xs'>{item.runs}</code></TableCell><TableCell><Button size='sm' variant='outline'>{item.status === 'active' ? <><Pause />Pause</> : <><Play />Run now</>}</Button></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></Main></>
}
