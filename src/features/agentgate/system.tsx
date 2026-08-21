import { useQuery } from '@tanstack/react-query'
import { HardDrive, MemoryStick, Server, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import { Meter, Sparkline } from './density-primitives'
import { AgentGateHeader } from './page-header'

type System = {
  vitals: {
    cpu_percent: number
    memory: { percent: number }
    disk: { percent: number }
    cpu_count: number
  }
  backups: { latest: { name: string } }
  containers: {
    name: string
    status: string
    uptime: string
    cpu: string
    memory: string
  }[]
  errors?: { at: string; service: string; level: string; message: string }[]
  packages?: { name: string; current: string; latest: string; state: string }[]
}

const histories = [
  [18, 24, 19, 31, 26, 35, 29, 22, 27],
  [41, 42, 43, 43, 44, 45, 46, 46, 46],
  [59, 59, 60, 60, 61, 61, 62, 63, 63],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
]

function Stat({
  title,
  value,
  note,
  icon: Icon,
  history,
}: {
  title: string
  value: string
  note: string
  icon: typeof Server
  history: number[]
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='size-4 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        <p className='font-mono text-2xl font-bold'>{value}</p>
        <p className='text-xs text-muted-foreground'>{note}</p>
        <Sparkline values={history} className='mt-3 text-muted-foreground' />
      </CardContent>
    </Card>
  )
}

export function SystemPage() {
  const query = useQuery({
    queryKey: ['agentgate', 'system'],
    queryFn: () => getAgentGate<System>('/api/system'),
  })
  const system = query.data
  return (
    <>
      <AgentGateHeader />
      <Main>
        <div className='mb-6'>
          <p className='text-sm text-muted-foreground'>
            Runtime health, verified backups, and local service status.
          </p>
        </div>
        <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          <Stat
            title='CPU'
            value={`${system?.vitals.cpu_percent ?? '—'}%`}
            note={`${system?.vitals.cpu_count ?? '—'} cores · 15 min`}
            icon={Server}
            history={histories[0]}
          />
          <Stat
            title='Memory'
            value={`${system?.vitals.memory.percent ?? '—'}%`}
            note='15.8 GB free · 15 min'
            icon={MemoryStick}
            history={histories[1]}
          />
          <Stat
            title='Disk'
            value={`${system?.vitals.disk.percent ?? '—'}%`}
            note='428 GB free · 15 min'
            icon={HardDrive}
            history={histories[2]}
          />
          <Stat
            title='Backup'
            value='31h'
            note='Age · policy target 24h'
            icon={ShieldCheck}
            history={histories[3]}
          />
        </div>
        <section className='mt-6'>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>Services</h2>
            <p className='text-xs text-muted-foreground'>
              Local components observed by the runtime supervisor.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uptime</TableHead>
                <TableHead className='min-w-36'>CPU</TableHead>
                <TableHead className='min-w-36'>Memory</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(system?.containers ?? []).map((service) => (
                <TableRow key={service.name}>
                  <TableCell className='font-medium'>{service.name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        service.status === 'healthy' ? 'secondary' : 'outline'
                      }
                    >
                      {service.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className='font-mono text-xs'>{service.uptime}</code>
                  </TableCell>
                  <TableCell>
                    <Meter
                      value={Number.parseFloat(service.cpu)}
                      label='load'
                    />
                  </TableCell>
                  <TableCell>
                    <Meter
                      value={Math.min(
                        100,
                        Math.round(Number.parseFloat(service.memory) / 12)
                      )}
                      label={service.memory}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <div className='mt-6 grid gap-8 xl:grid-cols-2'>
          <section id='history'>
            <div className='mb-3 border-b pb-3'>
              <h2 className='text-sm font-medium'>Error log tail</h2>
              <p className='text-xs text-muted-foreground'>
                Warnings and errors from the active supervisor window.
              </p>
            </div>
            <div className='space-y-3'>
              {(system?.errors ?? []).map((entry) => (
                <div
                  key={`${entry.at}-${entry.service}`}
                  className='grid gap-1 border-b pb-3 last:border-0 last:pb-0 sm:grid-cols-[64px_120px_1fr]'
                >
                  <code className='font-mono text-xs text-muted-foreground'>
                    {entry.at}
                  </code>
                  <div>
                    <Badge
                      variant={
                        entry.level === 'error' ? 'destructive' : 'outline'
                      }
                    >
                      {entry.service}
                    </Badge>
                  </div>
                  <p className='text-xs leading-5 text-muted-foreground'>
                    {entry.message}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section id='backups'>
            <div className='mb-3 border-b pb-3'>
              <h2 className='text-sm font-medium'>Package freshness</h2>
              <p className='text-xs text-muted-foreground'>
                Installed versions compared with the approved channel.
              </p>
            </div>
            <div className='space-y-3'>
              {(system?.packages ?? []).map((pkg) => (
                <div
                  key={pkg.name}
                  className='flex items-center justify-between gap-4 border-b pb-3 last:border-0 last:pb-0'
                >
                  <div>
                    <p className='text-sm font-medium'>{pkg.name}</p>
                    <p className='font-mono text-xs text-muted-foreground'>
                      {pkg.current} → {pkg.latest}
                    </p>
                  </div>
                  <Badge
                    variant={pkg.state === 'current' ? 'secondary' : 'outline'}
                  >
                    {pkg.state}
                  </Badge>
                </div>
              ))}
            </div>
          </section>
        </div>
      </Main>
    </>
  )
}
