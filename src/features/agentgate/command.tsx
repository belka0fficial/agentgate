import { useQuery } from '@tanstack/react-query'
import { Activity, Check, CircleAlert, HardDrive, MemoryStick, Server, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from './page-header'
import { Core } from './core'
import { getAgentGate, type Approval } from './api'

type Home = { pending_verifications: Approval[]; suggestions: { title: string; summary: string }[]; pinned_apps: { id: string; name: string; url: string }[] }
type System = { vitals: { cpu_percent: number; memory: { percent: number }; disk: { percent: number }; cpu_count: number }; backups: { latest: { name: string } } }

function StatCard({ title, value, note, icon: Icon }: { title: string; value: string; note: string; icon: typeof Activity }) {
  return <Card><CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'><CardTitle className='text-sm font-medium'>{title}</CardTitle><Icon className='size-4 text-muted-foreground' /></CardHeader><CardContent><div className='font-mono text-2xl font-bold tracking-tight'>{value}</div><p className='text-xs text-muted-foreground'>{note}</p></CardContent></Card>
}

export function CommandPage() {
  const home = useQuery({ queryKey: ['agentgate', 'home'], queryFn: () => getAgentGate<Home>('/api/home') })
  const system = useQuery({ queryKey: ['agentgate', 'system'], queryFn: () => getAgentGate<System>('/api/system') })
  const pending = home.data?.pending_verifications ?? []
  const vitals = system.data?.vitals
  const backup = system.data?.backups.latest.name ?? 'unknown'

  return <><AgentGateHeader /><Main>
    <div className='mb-6 flex items-center justify-between gap-4'><div><h1 className='text-2xl font-bold tracking-tight'>Command</h1><p className='text-sm text-muted-foreground'>Review live agent activity and decide what needs you.</p></div><Button variant='outline'><Activity />View system</Button></div>
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <StatCard title='CPU' value={`${vitals?.cpu_percent ?? '—'}%`} note={`${vitals?.cpu_count ?? '—'} cores available`} icon={Server} />
      <StatCard title='Memory' value={`${vitals?.memory.percent ?? '—'}%`} note='15.8 GB available' icon={MemoryStick} />
      <StatCard title='Disk' value={`${vitals?.disk.percent ?? '—'}%`} note='428 GB free' icon={HardDrive} />
      <StatCard title='Pending review' value={String(pending.length)} note='Owner decisions required' icon={ShieldCheck} />
    </div>
    <div className='mt-4 grid gap-4 lg:grid-cols-7'>
      <div className='space-y-4 lg:col-span-4'>
        <Card><CardHeader><CardTitle>Waiting for you</CardTitle><CardDescription>Actions that require an owner decision.</CardDescription></CardHeader><CardContent className='space-y-5'>{pending.map((item) => <ApprovalItem key={item.id} item={item} />)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Suggested next</CardTitle><CardDescription>Useful follow-ups from the current system context.</CardDescription></CardHeader><CardContent className='space-y-4'>{(home.data?.suggestions ?? []).map((item) => <div className='flex items-start justify-between gap-4' key={item.title}><div><p className='font-medium text-foreground'>{item.title}</p><p className='mt-1 text-sm text-muted-foreground'>{item.summary}</p></div><Button variant='outline' size='sm'>Ask agent</Button></div>)}</CardContent></Card>
      </div>
      <Card className='lg:col-span-3'><CardHeader><CardTitle>Agent core</CardTitle><CardDescription>Current system locus</CardDescription></CardHeader><CardContent className='flex flex-col items-center gap-5'><Core /><div className='flex w-full flex-wrap gap-2'>{(home.data?.pinned_apps ?? []).map((app) => <Button key={app.id} asChild variant='outline' size='sm'><a href={app.url} target='_blank' rel='noreferrer'>{app.name}</a></Button>)}</div><div className='w-full rounded-lg border p-3 text-sm'><div className='mb-3 flex items-center justify-between'><span className='font-medium'>Live activity</span><Badge variant='secondary'>20 events</Badge></div><div className='space-y-2 text-muted-foreground'><p>Approval binding created</p><p>Morning briefing assembled</p><p>Memory evidence scan finished</p><p>Backup verification passed</p></div></div></CardContent></Card>
    </div>
    <p className='mt-4 text-xs text-muted-foreground'>Latest backup: <code className='font-mono'>{backup}</code></p>
  </Main></>
}

function ApprovalItem({ item }: { item: Approval }) {
  const destructive = item.severity === 'high'
  return <div className='border-b pb-5 last:border-0 last:pb-0'><div className='flex items-start justify-between gap-4'><div><div className='flex items-center gap-2'><CircleAlert className='size-4 text-muted-foreground' /><p className='font-medium text-foreground'>{item.title}</p></div><p className='mt-1 text-sm text-muted-foreground'>{item.details}</p></div><Badge variant={destructive ? 'destructive' : 'secondary'}>{item.source}</Badge></div><pre className='mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-muted-foreground'>{`type: ${item.binding.type}\nid: ${item.binding.id}\nversion: ${item.binding.version}\ndigest: ${item.binding.digest}`}</pre><div className='mt-3 flex gap-2'><Button size='sm'><Check />Approve</Button><Button size='sm' variant='destructive'>Reject</Button></div></div>
}
