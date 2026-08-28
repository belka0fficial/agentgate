import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  type LucideIcon,
  ArrowRight,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CircleAlert,
  Database,
  HeartPulse,
  MessageSquarePlus,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { getAgentGate, relativeTime, type Approval } from './api'
import { buildCommandStatCards } from './command-cards'
import {
  emptyOrDegradedCopy,
  homeAttentionCopy,
  overallHomeStatus,
  sourceStateLabel,
  type SourceState,
} from './command-home'
import { AgentGateHeader } from './page-header'

type Suggestion = {
  id?: string
  title: string
  summary: string
  confidence?: number | string
}
type PinnedApp = {
  id: string
  name: string
  description?: string
  url: string
  status?: string
  source?: string
}
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
  last_run?: string
}
type MemoryStatus = {
  status: string
  source: string
  briefing?: string | null
  active_observations?: number
  active_patterns?: number
}
type Home = {
  source_status?: Record<string, SourceState>
  summary?: {
    pending_approvals: number
    recent_chats: number
    active_jobs: number
    pinned_apps: number
    suggestions: number
  }
  empty_states?: Record<string, string>
  memory_status?: MemoryStatus
  pinned_apps?: PinnedApp[]
  pending_verifications: Approval[]
  suggestions: Suggestion[]
  recent_chats?: ChatSession[]
  active_jobs?: Job[]
  anomalies?: { label: string; detail: string; severity: string }[]
  activity?: string[]
}
type System = {
  vitals: {
    cpu_percent: number
    memory: { percent: number }
    disk: { percent: number }
    cpu_count: number
  }
}
type ChatSession = {
  id: string
  title: string
  preview: string
  updated_at: string
}

export function CommandPage() {
  const home = useQuery({
    queryKey: ['agentgate', 'home'],
    queryFn: () => getAgentGate<Home>('/api/home'),
  })
  const system = useQuery({
    queryKey: ['agentgate', 'system'],
    queryFn: () => getAgentGate<System>('/api/system'),
  })

  const pending = home.data?.pending_verifications ?? []
  const anomalies = home.data?.anomalies ?? []
  const suggestions = home.data?.suggestions ?? []
  const recent = home.data?.recent_chats ?? []
  const jobs = home.data?.active_jobs ?? []
  const pinnedApps = home.data?.pinned_apps ?? []
  const emptyStates = home.data?.empty_states ?? {}
  const sourceStatus = home.data?.source_status ?? {}
  const memoryStatus = home.data?.memory_status
  const statCards = buildCommandStatCards(system.data)
  const overallStatus = overallHomeStatus(sourceStatus)

  return (
    <>
      <AgentGateHeader
        actions={
          <Badge variant={overallStatus === 'live' ? 'secondary' : 'outline'}>
            Home aggregation {overallStatus}
          </Badge>
        }
      />
      <Main fluid className='px-4 sm:px-6'>
        <section className='border-b pb-5'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between'>
            <div className='max-w-3xl'>
              <h2 className='text-xl font-semibold tracking-[-0.025em]'>
                Operational overview
              </h2>
              <p className='mt-1 text-sm leading-6 text-muted-foreground'>
                Source-bound approvals, conversations, jobs, apps, runtime data,
                and MemoryGate status. Unknown and degraded states remain
                explicit.
              </p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button asChild size='sm'>
                <Link to='/chats'>
                  <MessageSquarePlus />
                  Open chats
                </Link>
              </Button>
              <Button asChild size='sm' variant='outline'>
                <Link to='/approvals'>
                  <ShieldCheck />
                  Review approvals
                </Link>
              </Button>
            </div>
          </div>

          <dl className='mt-5 grid overflow-hidden rounded-lg border bg-surface-2 sm:grid-cols-4 sm:divide-x'>
            <SummaryValue
              label='Pending approvals'
              value={String(pending.length)}
              detail={sourceStateLabel(
                sourceStatus.toolgate_requests ?? { status: 'unknown' }
              )}
            />
            <SummaryValue
              label='Active jobs'
              value={String(jobs.length)}
              detail={sourceStateLabel(
                sourceStatus.toolgate_automations ?? { status: 'unknown' }
              )}
            />
            <SummaryValue
              label='Recent chats'
              value={String(recent.length)}
              detail={sourceStateLabel(
                sourceStatus.pi_sessions ?? { status: 'unknown' }
              )}
            />
            <SummaryValue
              label='Pinned apps'
              value={String(pinnedApps.length)}
              detail={sourceStateLabel(
                sourceStatus.app_registry ?? { status: 'unknown' }
              )}
            />
          </dl>
        </section>

        <div className='grid gap-8 py-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
          <div className='min-w-0 space-y-8'>
            <section>
              <SectionHeading
                title='Needs your attention'
                detail={homeAttentionCopy({
                  pending: pending.length,
                  sourceState: sourceStatus.toolgate_requests,
                })}
              />
              <div className='divide-y overflow-hidden rounded-lg border bg-card'>
                {pending.length === 0 ? (
                  <StateCard
                    icon={ShieldCheck}
                    text={emptyOrDegradedCopy(
                      'Pending approvals',
                      emptyStates.pending_verifications
                    )}
                  />
                ) : (
                  pending
                    .slice(0, 6)
                    .map((item) => <AttentionCard key={item.id} item={item} />)
                )}
              </div>
            </section>

            <section>
              <SectionHeading
                title='Continue conversations'
                detail='Recent source-bound sessions'
              />
              <div className='divide-y overflow-hidden rounded-lg border bg-card'>
                {recent.length === 0 ? (
                  <StateCard
                    icon={MessageSquarePlus}
                    text={emptyOrDegradedCopy(
                      'Recent chats',
                      emptyStates.recent_chats
                    )}
                  />
                ) : (
                  recent.map((chat) => (
                    <Link
                      key={chat.id}
                      to='/chats/$id'
                      params={{ id: chat.id }}
                      className='group flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/60'
                    >
                      <div className='min-w-0 flex-1'>
                        <p className='truncate text-sm font-medium'>
                          {chat.title}
                        </p>
                        <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                          {chat.preview || 'No preview reported'}
                        </p>
                      </div>
                      <time className='shrink-0 font-mono text-[11px] text-muted-foreground'>
                        {relativeTime(chat.updated_at)}
                      </time>
                      <ArrowRight className='size-3.5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5' />
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section>
              <SectionHeading
                title='Jobs and schedules'
                detail='Active or recently important runtime schedules'
              />
              <div className='divide-y overflow-hidden rounded-lg border bg-card'>
                {jobs.length === 0 ? (
                  <StateCard
                    icon={CalendarClock}
                    text={emptyOrDegradedCopy('Jobs', emptyStates.active_jobs)}
                  />
                ) : (
                  jobs.map((item) => <JobCard key={item.id} item={item} />)
                )}
              </div>
            </section>

            <section>
              <SectionHeading
                title='Pinned apps'
                detail='Local AgentGate app registry pins'
              />
              <div className='divide-y overflow-hidden rounded-lg border bg-card'>
                {pinnedApps.length === 0 ? (
                  <StateCard
                    icon={BriefcaseBusiness}
                    text={emptyOrDegradedCopy(
                      'Pinned apps',
                      emptyStates.pinned_apps
                    )}
                  />
                ) : (
                  pinnedApps.map((item) => (
                    <PinnedAppCard key={item.id} item={item} />
                  ))
                )}
              </div>
            </section>

            <section>
              <SectionHeading
                title='Context suggestions'
                detail='Suggestions reported by the current source context'
              />
              <div className='divide-y overflow-hidden rounded-lg border bg-card'>
                {suggestions.length === 0 ? (
                  <StateCard
                    icon={Sparkles}
                    text={emptyOrDegradedCopy(
                      'Suggestions',
                      emptyStates.suggestions
                    )}
                  />
                ) : (
                  suggestions
                    .slice(0, 5)
                    .map((item) => (
                      <SuggestionCard key={item.id ?? item.title} item={item} />
                    ))
                )}
              </div>
            </section>
          </div>

          <aside className='min-w-0 space-y-6 xl:sticky xl:top-20 xl:self-start'>
            <section>
              <SectionHeading
                title='Runtime snapshot'
                detail='Latest SystemGate sample'
              />
              <div className='divide-y rounded-lg border bg-card'>
                {statCards.map((item) => (
                  <div
                    key={item.title}
                    className='flex items-center justify-between gap-4 px-4 py-3'
                  >
                    <div>
                      <p className='text-sm font-medium'>{item.title}</p>
                      <p className='text-xs text-muted-foreground'>
                        {item.note}
                      </p>
                    </div>
                    <code className='font-mono text-sm tabular-nums'>
                      {item.value}
                    </code>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading
                title='Memory status'
                detail='Bounded MemoryGate summary'
              />
              <MemoryStatusCard item={memoryStatus} />
            </section>

            <section>
              <SectionHeading
                title='Source status'
                detail='Metadata availability, never credentials'
              />
              <div className='divide-y rounded-lg border bg-card'>
                {Object.entries(sourceStatus).length === 0 ? (
                  <StateCard
                    icon={Database}
                    text='unknown · Home has not loaded source status.'
                  />
                ) : (
                  Object.entries(sourceStatus).map(([name, state]) => (
                    <div
                      key={name}
                      className='flex items-center justify-between gap-3 px-4 py-3'
                    >
                      <span className='min-w-0 truncate text-xs text-muted-foreground'>
                        {name}
                      </span>
                      <Badge
                        variant={
                          state.status === 'live' ? 'secondary' : 'outline'
                        }
                      >
                        {sourceStateLabel(state)}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section>
              <SectionHeading title='Signals' detail='Reported anomalies' />
              <div className='divide-y rounded-lg border bg-card'>
                {anomalies.length === 0 ? (
                  <StateCard
                    icon={CircleAlert}
                    text='empty · no signals reported.'
                  />
                ) : (
                  anomalies.slice(0, 4).map((item) => (
                    <div key={item.label} className='flex gap-3 px-4 py-3'>
                      <CircleAlert className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                      <div className='min-w-0'>
                        <p className='text-sm font-medium'>{item.label}</p>
                        <p className='mt-0.5 text-xs leading-5 text-muted-foreground'>
                          {item.detail}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </Main>
    </>
  )
}

function SummaryValue({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail: string
}) {
  return (
    <div className='border-b px-4 py-3 last:border-b-0 sm:border-b-0'>
      <dt className='text-xs text-muted-foreground'>{label}</dt>
      <dd className='mt-1 flex items-baseline justify-between gap-3'>
        <span className='font-mono text-lg font-medium tabular-nums'>
          {value}
        </span>
        <span className='truncate text-[11px] text-muted-foreground'>
          {detail}
        </span>
      </dd>
    </div>
  )
}

function SoftNumber({ value, label }: { value: number; label: string }) {
  return (
    <div className='rounded-md bg-surface-2 px-3 py-3'>
      <p className='font-mono text-2xl font-semibold'>{value}</p>
      <p className='mt-1 text-[11px] text-muted-foreground'>{label}</p>
    </div>
  )
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className='mb-3 flex items-end justify-between gap-4'>
      <div>
        <h2 className='text-sm font-medium'>{title}</h2>
        <p className='text-xs text-muted-foreground'>{detail}</p>
      </div>
    </div>
  )
}

function StateCard({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className='flex items-start gap-3 px-4 py-4 text-xs leading-5 text-muted-foreground'>
      <Icon className='mt-0.5 size-4 shrink-0' />
      <span>{text || 'unknown · source has not reported data.'}</span>
    </div>
  )
}

function AttentionCard({ item }: { item: Approval & { source_id?: string } }) {
  return (
    <div className='px-4 py-3'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <Badge variant={item.severity === 'high' ? 'destructive' : 'secondary'}>
          {item.source}
        </Badge>
        <code className='font-mono text-[11px] text-muted-foreground'>
          {relativeTime(item.created_at)}
        </code>
      </div>
      <p className='text-sm font-medium'>{item.title}</p>
      <p className='mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground'>
        {item.details}
      </p>
      <div className='mt-4 flex gap-2'>
        <Button size='sm' variant='secondary' asChild>
          <Link to='/approvals'>
            <Check />
            Review
          </Link>
        </Button>
      </div>
    </div>
  )
}

function SuggestionCard({ item }: { item: Suggestion }) {
  const confidence =
    typeof item.confidence === 'number'
      ? `${item.confidence}%`
      : (item.confidence ?? 'unknown')
  return (
    <div className='px-4 py-3'>
      <div className='mb-3 flex items-center gap-2 text-muted-foreground'>
        <Sparkles className='size-4' />
        <span className='font-mono text-[11px]'>{confidence} confidence</span>
      </div>
      <p className='text-sm font-medium'>{item.title}</p>
      <p className='mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground'>
        {item.summary}
      </p>
    </div>
  )
}

function PinnedAppCard({ item }: { item: PinnedApp }) {
  return (
    <a
      href={item.url}
      target='_blank'
      rel='noreferrer'
      className='group block px-4 py-3 transition-colors hover:bg-accent/60'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium'>{item.name}</p>
          <p className='mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground'>
            {item.description || 'No description supplied.'}
          </p>
        </div>
        <ArrowRight className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
      </div>
      <p className='mt-3 font-mono text-[11px] text-muted-foreground'>
        {item.source ?? 'agentgate'} · {item.status ?? 'unknown'}
      </p>
    </a>
  )
}

function JobCard({ item }: { item: Job }) {
  return (
    <div className='px-4 py-3'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <Badge
          variant={item.last_status === 'failed' ? 'destructive' : 'outline'}
        >
          {item.status ?? item.last_status ?? 'unknown'}
        </Badge>
        <CalendarClock className='size-4 text-muted-foreground' />
      </div>
      <p className='text-sm font-medium'>
        {item.name ?? item.title ?? item.id}
      </p>
      <p className='mt-2 font-mono text-[11px] text-muted-foreground'>
        {item.schedule ?? 'schedule unknown'} · next{' '}
        {item.next_run ?? item.next ?? 'unknown'}
      </p>
      <p className='mt-1 font-mono text-[11px] text-muted-foreground'>
        last {item.last_run ?? 'not reported'}
      </p>
    </div>
  )
}

function MemoryStatusCard({ item }: { item?: MemoryStatus }) {
  if (!item) {
    return (
      <StateCard
        icon={Database}
        text='unknown · MemoryGate status has not loaded.'
      />
    )
  }
  return (
    <div className='px-4 py-3'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <Badge variant={item.status === 'live' ? 'secondary' : 'outline'}>
          {item.status}
        </Badge>
        <HeartPulse className='size-4 text-muted-foreground' />
      </div>
      <p className='text-sm font-medium'>MemoryGate</p>
      <p className='mt-2 text-xs leading-5 text-muted-foreground'>
        {item.briefing ||
          (item.status === 'empty'
            ? 'empty · no briefing, observations, or active patterns reported.'
            : 'No briefing summary available.')}
      </p>
      <div className='mt-3 grid grid-cols-2 gap-2 text-center'>
        <SoftNumber
          value={item.active_observations ?? 0}
          label='observations'
        />
        <SoftNumber value={item.active_patterns ?? 0} label='patterns' />
      </div>
    </div>
  )
}
