import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import { getAgentGate, postAgentGate } from './api'
import { AgentGateHeader } from './page-header'

type Job = {
  id: string
  name?: string
  title?: string
  prompt?: string
  schedule?: string
  next_run?: string
  next?: string
  status?: string
  paused?: boolean
  last_status?: string
  last_run?: string
  last_output?: string
  output?: string
}

type JobsResponse = Job[] | { jobs?: Job[] }

export function JobsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['agentgate', 'jobs'],
    queryFn: () => getAgentGate<JobsResponse>('/api/cron/jobs'),
  })
  const action = useMutation({
    mutationFn: ({
      jobId,
      actionName,
    }: {
      jobId: string
      actionName: 'pause' | 'resume' | 'run'
    }) =>
      postAgentGate(
        `/api/cron/jobs/${encodeURIComponent(jobId)}/${actionName}`
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['agentgate', 'jobs'] }),
  })

  const jobs = Array.isArray(query.data) ? query.data : (query.data?.jobs ?? [])

  return (
    <>
      <AgentGateHeader title='Jobs' eyebrow='Scheduled agent work' />
      <Main>
        <div className='mb-6'>
          <p className='text-sm text-muted-foreground'>
            Jobs are scheduled or triggered agent work owned by the runtime.
            ToolGate Automations live under Capabilities.
          </p>
        </div>
        <section>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>Runtime jobs</h2>
            <p className='text-xs text-muted-foreground'>
              Source-bound schedules and outputs from the Pi/runtime adapter.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Last run</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Next</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className='py-8 text-sm text-muted-foreground'
                  >
                    {query.isLoading
                      ? 'Loading jobs…'
                      : 'No runtime jobs reported.'}
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((item) => {
                  const paused =
                    Boolean(item.paused) || item.status === 'paused'
                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <p className='font-medium'>
                          {item.name ?? item.title ?? item.id}
                        </p>
                        <p className='max-w-sm text-xs text-muted-foreground'>
                          {item.prompt ?? 'No prompt summary available'}
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
                            {item.last_status ?? item.status ?? 'unknown'}
                          </Badge>
                          <code className='font-mono text-xs text-muted-foreground'>
                            {item.last_run ?? '—'}
                          </code>
                        </div>
                        <p className='mt-1 max-w-56 truncate text-xs text-muted-foreground'>
                          {item.last_output ?? item.output ?? 'No output'}
                        </p>
                      </TableCell>
                      <TableCell>
                        <code className='font-mono text-xs'>
                          {item.schedule ?? '—'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <code className='font-mono text-xs'>
                          {item.next_run ?? item.next ?? '—'}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className='flex justify-end gap-2'>
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={action.isPending}
                            onClick={() =>
                              action.mutate({
                                jobId: item.id,
                                actionName: paused ? 'resume' : 'pause',
                              })
                            }
                          >
                            {paused ? <Play /> : <Pause />}
                            {paused ? 'Resume' : 'Pause'}
                          </Button>
                          <Button
                            size='sm'
                            variant='secondary'
                            disabled={action.isPending}
                            onClick={() =>
                              action.mutate({
                                jobId: item.id,
                                actionName: 'run',
                              })
                            }
                          >
                            <Play />
                            Run now
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </section>
      </Main>
    </>
  )
}

export const AutomationsPage = JobsPage
