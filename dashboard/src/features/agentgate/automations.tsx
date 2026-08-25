import { useQuery } from '@tanstack/react-query'
import { Pause, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { RunDots } from './density-primitives'
import { AgentGateHeader } from './page-header'

type Automation = {
  id: string
  name: string
  description: string
  schedule: string
  next: string
  status: string
  runs: number
  last_status?: string
  last_run?: string
  output?: string
  history?: string
}
export function AutomationsPage() {
  const query = useQuery({
    queryKey: ['agentgate', 'automations'],
    queryFn: () =>
      getAgentGate<{ automations: Automation[] }>('/api/automations'),
  })
  return (
    <>
      <AgentGateHeader />
      <Main>
        <div className='mb-6'>
          <p className='text-sm text-muted-foreground'>
            Scheduled work that remains inside its reviewed policy.
          </p>
        </div>
        <section>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>Automation runs</h2>
            <p className='text-xs text-muted-foreground'>
              Last output and recent results stay visible beside each schedule.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Automation</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Recent history</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Next</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(query.data?.automations ?? []).map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className='font-medium'>{item.name}</p>
                    <p className='max-w-sm text-xs text-muted-foreground'>
                      {item.description}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-2'>
                      <Badge
                        variant={
                          item.last_status === 'failed'
                            ? 'destructive'
                            : item.last_status === 'success'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {item.last_status ?? item.status}
                      </Badge>
                      <code className='font-mono text-xs text-muted-foreground'>
                        {item.last_run ?? '—'}
                      </code>
                    </div>
                    <p className='mt-1 max-w-56 truncate text-xs text-muted-foreground'>
                      {item.output ?? 'No output'}
                    </p>
                  </TableCell>
                  <TableCell>
                    <RunDots history={item.history ?? '------------'} />
                    <p className='mt-1 font-mono text-[11px] text-muted-foreground'>
                      {item.runs} total
                    </p>
                  </TableCell>
                  <TableCell>
                    <code className='font-mono text-xs'>{item.schedule}</code>
                  </TableCell>
                  <TableCell>
                    <code className='font-mono text-xs'>{item.next}</code>
                  </TableCell>
                  <TableCell>
                    <Button size='sm' variant='outline'>
                      {item.status === 'active' ? (
                        <>
                          <Pause />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play />
                          Run now
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </Main>
    </>
  )
}
