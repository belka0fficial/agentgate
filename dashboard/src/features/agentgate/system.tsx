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
import { Meter } from './density-primitives'
import { AgentGateHeader } from './page-header'
import {
  buildSystemOverview,
  type SourceState,
  type SystemService,
  type SystemSnapshot,
  type SystemStat,
} from './system-overview'

function stateVariant(state: SourceState) {
  if (state === 'live' || state === 'empty') return 'secondary'
  if (state === 'degraded' || state === 'blocked') return 'destructive'
  return 'outline'
}

function Stat({
  title,
  value,
  note,
  state,
  icon: Icon,
}: SystemStat & { icon: typeof Server }) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-1'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='size-4 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        <div className='flex items-start justify-between gap-3'>
          <p className='font-mono text-2xl font-bold'>{value}</p>
          <Badge variant={stateVariant(state)}>{state}</Badge>
        </div>
        <p className='mt-1 text-xs text-muted-foreground'>{note}</p>
      </CardContent>
    </Card>
  )
}

export function SystemPage() {
  const query = useQuery({
    queryKey: ['agentgate', 'system'],
    queryFn: () => getAgentGate<SystemSnapshot>('/api/system'),
  })
  const overview = buildSystemOverview(query.data)
  return (
    <>
      <AgentGateHeader />
      <Main>
        <div className='mb-6'>
          <p className='text-sm text-muted-foreground'>
            Source-bound read-only telemetry from SystemGate. Unknown, empty,
            and degraded states are shown instead of inferred health.
          </p>
        </div>
        {query.error ? (
          <div className='mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
            SystemGate overview blocked: {query.error.message}
          </div>
        ) : null}
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          {overview.stats.map((stat) => (
            <Stat
              key={stat.title}
              {...stat}
              icon={
                stat.title === 'CPU'
                  ? Server
                  : stat.title === 'Memory'
                    ? MemoryStick
                    : stat.title === 'Disk'
                      ? HardDrive
                      : ShieldCheck
              }
            />
          ))}
        </div>
        <section className='mt-6'>
          <div className='mb-2 flex items-end justify-between gap-3 border-b pb-3'>
            <div>
              <h2 className='text-sm font-medium'>Services</h2>
              <p className='text-xs text-muted-foreground'>
                Local components only when SystemGate reports them.
              </p>
            </div>
            <Badge variant={stateVariant(overview.serviceState)}>
              {overview.serviceState}
            </Badge>
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
              {overview.services.map((service) => (
                <ServiceRow key={service.name} service={service} />
              ))}
              {!overview.services.length ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='py-8 text-center text-sm text-muted-foreground'
                  >
                    {overview.serviceState === 'degraded'
                      ? 'SystemGate service source is unavailable.'
                      : 'SystemGate returned no service rows.'}
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </section>
        <section className='mt-6'>
          <div className='mb-3 flex items-end justify-between gap-3 border-b pb-3'>
            <div>
              <h2 className='text-sm font-medium'>Backup source</h2>
              <p className='text-xs text-muted-foreground'>
                Backup status is displayed only from the SystemGate backup
                payload.
              </p>
            </div>
            <Badge variant={stateVariant(overview.backupState)}>
              {overview.backupState}
            </Badge>
          </div>
          <p className='rounded-xl bg-card p-4 text-sm text-muted-foreground'>
            {overview.stats.find((stat) => stat.title === 'Backup')?.note ??
              'No backup source data'}
          </p>
        </section>
      </Main>
    </>
  )
}

function ServiceRow({ service }: { service: SystemService }) {
  const cpuValue = Number.parseFloat(service.cpu)
  const memoryIsPercent = service.memory.trim().endsWith('%')
  const memoryValue = memoryIsPercent
    ? Number.parseFloat(service.memory)
    : Number.NaN
  return (
    <TableRow>
      <TableCell className='font-medium'>{service.name}</TableCell>
      <TableCell>
        <Badge variant='outline'>{service.status}</Badge>
      </TableCell>
      <TableCell>
        <code className='font-mono text-xs'>{service.uptime}</code>
      </TableCell>
      <TableCell>
        {Number.isFinite(cpuValue) ? (
          <Meter value={cpuValue} label='reported load' />
        ) : (
          <span className='text-xs text-muted-foreground'>{service.cpu}</span>
        )}
      </TableCell>
      <TableCell>
        {Number.isFinite(memoryValue) ? (
          <Meter value={Math.min(100, memoryValue)} label={service.memory} />
        ) : (
          <span className='text-xs text-muted-foreground'>
            {service.memory}
          </span>
        )}
      </TableCell>
    </TableRow>
  )
}
