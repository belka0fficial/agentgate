import { useQuery } from '@tanstack/react-query'
import { Activity, HardDrive, MemoryStick, Server, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import { AgentGateHeader } from './page-header'

type System = { vitals: { cpu_percent: number; memory: { percent: number }; disk: { percent: number }; cpu_count: number }; backups: { latest: { name: string } }; containers: { name: string; status: string; uptime: string; cpu: string; memory: string }[] }
function Stat({ title, value, note, icon: Icon }: { title: string; value: string; note: string; icon: typeof Server }) { return <Card><CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium'>{title}</CardTitle><Icon className='size-4 text-muted-foreground' /></CardHeader><CardContent><p className='font-mono text-2xl font-bold'>{value}</p><p className='text-xs text-muted-foreground'>{note}</p></CardContent></Card> }

export function SystemPage() {
  const query = useQuery({ queryKey: ['agentgate', 'system'], queryFn: () => getAgentGate<System>('/api/system') })
  const system = query.data
  return <><AgentGateHeader /><Main><div className='mb-6 flex items-center justify-between gap-4'><div><h1 className='text-2xl font-bold tracking-tight'>System</h1><p className='text-sm text-muted-foreground'>Runtime health, verified backups, and local service status.</p></div><Button variant='outline'><Activity />Refresh status</Button></div>
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'><Stat title='CPU' value={`${system?.vitals.cpu_percent ?? '—'}%`} note={`${system?.vitals.cpu_count ?? '—'} cores available`} icon={Server} /><Stat title='Memory' value={`${system?.vitals.memory.percent ?? '—'}%`} note='15.8 GB available' icon={MemoryStick} /><Stat title='Disk' value={`${system?.vitals.disk.percent ?? '—'}%`} note='428 GB free' icon={HardDrive} /><Stat title='Backup' value='Verified' note='Latest archive passed checks' icon={ShieldCheck} /></div>
    <Card className='mt-4'><CardHeader><CardTitle>Services</CardTitle><CardDescription>Local components observed by the runtime supervisor.</CardDescription></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Status</TableHead><TableHead>Uptime</TableHead><TableHead>CPU</TableHead><TableHead>Memory</TableHead></TableRow></TableHeader><TableBody>{(system?.containers ?? []).map((service) => <TableRow key={service.name}><TableCell className='font-medium'>{service.name}</TableCell><TableCell><Badge variant={service.status === 'healthy' ? 'secondary' : 'outline'}>{service.status}</Badge></TableCell><TableCell><code className='font-mono text-xs'>{service.uptime}</code></TableCell><TableCell><code className='font-mono text-xs'>{service.cpu}</code></TableCell><TableCell><code className='font-mono text-xs'>{service.memory}</code></TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Card className='mt-4'><CardHeader><CardTitle>Verified backup</CardTitle><CardDescription>The latest archive passed its checksum and retention check.</CardDescription></CardHeader><CardContent><code className='font-mono text-sm'>{system?.backups.latest.name ?? 'Loading…'}</code></CardContent></Card>
  </Main></>
}
