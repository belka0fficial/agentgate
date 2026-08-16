import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from './page-header'
import { getAgentGate, type Approval } from './api'

export function ApprovalsPage() {
  const approvals = useQuery({ queryKey: ['agentgate', 'approvals'], queryFn: () => getAgentGate<Approval[]>('/api/approvals') })
  const rows = approvals.data ?? []
  return <><AgentGateHeader /><Main><div className='mb-6'><h1 className='text-2xl font-bold tracking-tight'>Approvals</h1><p className='text-sm text-muted-foreground'>Review exactly what the agent is asking to do.</p></div><Card><CardHeader><CardTitle>Waiting for you</CardTitle><CardDescription>{rows.length} owner decisions are pending.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Action</TableHead><TableHead>Source</TableHead><TableHead>Binding</TableHead><TableHead className='text-right'>Decision</TableHead></TableRow></TableHeader><TableBody>{rows.map((item) => <TableRow key={item.id}><TableCell className='whitespace-normal'><p className='font-medium'>{item.title}</p><p className='mt-1 text-xs text-muted-foreground'>{item.details}</p></TableCell><TableCell><Badge variant={item.severity === 'high' ? 'destructive' : 'secondary'}>{item.source}</Badge></TableCell><TableCell className='whitespace-normal'><code className='font-mono text-xs text-muted-foreground'>{item.binding.type}<br />{item.binding.digest}</code></TableCell><TableCell><div className='flex justify-end gap-2'><Button size='sm' variant='secondary'><Check />Approve</Button><Button size='sm' variant='outline' className='border-destructive text-destructive hover:bg-destructive hover:text-white'><X />Reject</Button></div></TableCell></TableRow>)}</TableBody></Table></CardContent></Card></Main></>
}
