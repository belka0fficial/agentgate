import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Lock, Pause, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { getAgentGate, postAgentGate } from './api'
import {
  canRenderJobControls,
  jobActionsEnabled,
  normalizeToolGateOverview,
  safeJobHistoryLabel,
} from './automations-model'
import { AgentGateHeader } from './page-header'

type Job = {
  id: string
  name?: string
  title?: string
  schedule?: string
  next_run?: string
  next?: string
  status?: string
  paused?: boolean
  last_status?: string
  last_run?: string | null
  owner?: string
  editable?: boolean
  kind?: string
  source_ref?: string
  output?: { status?: string; raw_withheld?: boolean }
  history?: { status?: string; reason?: string }
}

type SourceError = { source?: string; message?: string } | string | null

type AutomationOverviewResponse = {
  jobs?: Job[]
  toolgate_automations?: Job[]
  errors?: Record<string, SourceError>
}

function errorMessage(error: SourceError | undefined) {
  if (!error) return null
  if (typeof error === 'string') return error
  return error.message ?? error.source ?? 'Source unavailable'
}

export function JobsPage() {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['agentgate', 'automations'],
    queryFn: () => getAgentGate<AutomationOverviewResponse>('/api/automations'),
  })
  const toolgateQuery = useQuery({
    queryKey: ['agentgate', 'toolgate-detail'],
    queryFn: () => getAgentGate('/api/gates/toolgate'),
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
      queryClient.invalidateQueries({ queryKey: ['agentgate', 'automations'] }),
  })

  const jobs = query.data?.jobs ?? []
  const brainError = errorMessage(query.data?.errors?.brain)
  const toolgateError = errorMessage(query.data?.errors?.toolgate)
  const toolgateOverview = normalizeToolGateOverview(
    (toolgateQuery.data ?? {}) as Parameters<
      typeof normalizeToolGateOverview
    >[0]
  )

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

        <section className='mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          {toolgateOverview.sources.map((source) => (
            <Card key={source.id}>
              <CardHeader className='pb-2'>
                <CardTitle className='flex items-center justify-between gap-2 text-sm'>
                  <span>ToolGate {source.id}</span>
                  <Badge
                    variant={
                      source.status === 'live'
                        ? 'secondary'
                        : source.status === 'degraded' ||
                            source.status === 'offline' ||
                            source.status === 'blocked'
                          ? 'destructive'
                          : 'outline'
                    }
                  >
                    {source.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-xs text-muted-foreground'>
                  {source.source} metadata only; no raw args, results, logs,
                  commands, provider URLs, or host paths.
                </p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>Runtime jobs</h2>
            <p className='text-xs text-muted-foreground'>
              Source-bound schedules and outputs from the Pi/runtime adapter.
            </p>
          </div>
          {brainError ? (
            <div className='mb-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
              Brain jobs degraded: {brainError}
            </div>
          ) : null}
          <div className='hidden md:block'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job</TableHead>
                  <TableHead>Kind</TableHead>
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
                      colSpan={6}
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
                    const actionsEnabled = jobActionsEnabled(item)
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <p className='font-medium'>{item.name}</p>
                          <p className='text-xs text-muted-foreground'>
                            {item.owner === 'system'
                              ? 'Built-in system job; locked metadata only.'
                              : 'Runtime job metadata only; prompts stay server-side.'}
                          </p>
                          {item.source_ref ? (
                            <p className='mt-1 text-xs break-all text-muted-foreground'>
                              Source: {item.source_ref}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant='outline'>{item.kind ?? 'cron'}</Badge>
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
                          <p className='mt-1 text-xs text-muted-foreground'>
                            {item.output?.raw_withheld === true
                              ? `Output ${item.output.status ?? 'withheld'}.`
                              : 'Output withheld from overview.'}{' '}
                            {safeJobHistoryLabel(item)}.
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
                          {canRenderJobControls(item) ? (
                            <div className='flex justify-end gap-2'>
                              <Button
                                size='sm'
                                variant='outline'
                                disabled={action.isPending || !actionsEnabled}
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
                                disabled={action.isPending || !actionsEnabled}
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
                          ) : (
                            <div className='flex justify-end'>
                              <Badge variant='outline'>
                                <Lock />
                                System locked
                              </Badge>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
          <div
            data-mobile-records
            className='divide-y overflow-hidden rounded-lg border bg-card md:hidden'
          >
            {jobs.length === 0 ? (
              <div className='px-4 py-8 text-sm text-muted-foreground'>
                {query.isLoading
                  ? 'Loading jobs…'
                  : 'No runtime jobs reported.'}
              </div>
            ) : (
              jobs.map((item) => {
                const paused = Boolean(item.paused) || item.status === 'paused'
                const actionsEnabled = jobActionsEnabled(item)
                return (
                  <article key={item.id} className='px-4 py-4'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <h3 className='text-sm font-medium'>{item.name}</h3>
                        <p className='mt-0.5 text-xs text-muted-foreground'>
                          {item.owner === 'system'
                            ? 'Built-in system job'
                            : 'Runtime job'}
                        </p>
                      </div>
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
                    </div>
                    <dl className='mt-3 grid grid-cols-2 gap-2 text-xs'>
                      <div>
                        <dt className='text-muted-foreground'>Kind</dt>
                        <dd className='mt-0.5'>{item.kind ?? 'cron'}</dd>
                      </div>
                      <div>
                        <dt className='text-muted-foreground'>Last run</dt>
                        <dd className='mt-0.5 font-mono'>
                          {item.last_run ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-muted-foreground'>Schedule</dt>
                        <dd className='mt-0.5 font-mono'>
                          {item.schedule ?? '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className='text-muted-foreground'>Next run</dt>
                        <dd className='mt-0.5 font-mono'>
                          {item.next_run ?? item.next ?? '—'}
                        </dd>
                      </div>
                      {item.source_ref ? (
                        <div className='col-span-2'>
                          <dt className='text-muted-foreground'>
                            Source reference
                          </dt>
                          <dd className='mt-0.5 break-all'>
                            {item.source_ref}
                          </dd>
                        </div>
                      ) : null}
                      <div className='col-span-2'>
                        <dt className='text-muted-foreground'>
                          Output and history
                        </dt>
                        <dd className='mt-0.5 leading-5'>
                          {item.output?.raw_withheld === true
                            ? `Output ${item.output.status ?? 'withheld'}.`
                            : 'Output withheld from overview.'}{' '}
                          {safeJobHistoryLabel(item)}.
                        </dd>
                      </div>
                    </dl>
                    <div className='mt-4 flex flex-wrap justify-end gap-2'>
                      {canRenderJobControls(item) ? (
                        <>
                          <Button
                            size='sm'
                            variant='outline'
                            disabled={action.isPending || !actionsEnabled}
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
                            disabled={action.isPending || !actionsEnabled}
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
                        </>
                      ) : (
                        <Badge variant='outline'>
                          <Lock />
                          System locked
                        </Badge>
                      )}
                    </div>
                  </article>
                )
              })
            )}
          </div>
        </section>

        <section className='mt-6'>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>ToolGate automations</h2>
            <p className='text-xs text-muted-foreground'>
              Sanitized automation metadata only. Tool arguments stay inside
              ToolGate; execution actions remain planned until approval
              contracts exist.
            </p>
          </div>
          {toolgateError ? (
            <div className='mb-3 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive'>
              ToolGate automations degraded: {toolgateError}
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Automation</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {toolgateOverview.automations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className='py-8 text-sm text-muted-foreground'
                  >
                    No ToolGate automations reported.
                  </TableCell>
                </TableRow>
              ) : (
                toolgateOverview.automations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <p className='font-medium'>{item.name}</p>
                      <p className='text-xs text-muted-foreground'>
                        Arguments/results withheld. Actions planned pending
                        ToolGate approval contract.
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className='space-y-1'>
                        <Badge variant='outline'>{item.status}</Badge>
                        {item.approvalHref ? (
                          <Button
                            asChild
                            size='sm'
                            variant='link'
                            className='h-auto p-0 text-xs'
                          >
                            <Link
                              to='/approvals'
                              search={{
                                source_id:
                                  item.approvalHref.split('source_id=')[1],
                              }}
                            >
                              Approval
                            </Link>
                          </Button>
                        ) : (
                          <p className='text-xs text-muted-foreground'>
                            No approval link
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className='font-mono text-xs'>
                        {item.schedule ?? '—'}
                      </code>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>

        <section className='mt-6'>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>ToolGate events</h2>
            <p className='text-xs text-muted-foreground'>
              Recent event metadata from ToolGate. Args, stdout, stderr, logs,
              command lines, and results are withheld.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Binding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {toolgateOverview.events.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className='py-8 text-sm text-muted-foreground'
                  >
                    No ToolGate events reported.
                  </TableCell>
                </TableRow>
              ) : (
                toolgateOverview.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <p className='font-medium'>{event.kind}</p>
                      <code className='text-xs text-muted-foreground'>
                        {event.id}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{event.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <code className='text-xs'>
                        {event.args_digest ?? 'digest withheld/not provided'}
                      </code>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </section>
      </Main>
    </>
  )
}

export const AutomationsPage = JobsPage
