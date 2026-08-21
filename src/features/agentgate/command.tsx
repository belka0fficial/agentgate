import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Activity,
  ArrowRight,
  Check,
  CircleAlert,
  HardDrive,
  MemoryStick,
  MessageSquarePlus,
  Server,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { getAgentGate, relativeTime, type Approval } from './api'
import { Core } from './core'
import { Sparkline } from './density-primitives'
import { AgentGateHeader } from './page-header'

type Suggestion = { title: string; summary: string; confidence?: number }
type Home = {
  pending_verifications: Approval[]
  suggestions: Suggestion[]
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

const histories = {
  cpu: [18, 24, 19, 31, 26, 35, 29, 22, 27, 33, 24, 27],
  memory: [41, 42, 42, 43, 44, 45, 46, 45, 46, 47, 46, 46],
  disk: [59, 59, 60, 60, 61, 61, 62, 62, 62, 63, 63, 63],
  approvals: [2, 3, 3, 5, 4, 4, 6, 5, 4, 4, 4, 4],
}

export function CommandPage() {
  const home = useQuery({
    queryKey: ['agentgate', 'home'],
    queryFn: () => getAgentGate<Home>('/api/home'),
  })
  const chats = useQuery({
    queryKey: ['agentgate', 'chats'],
    queryFn: () => getAgentGate<{ sessions: ChatSession[] }>('/api/chats'),
  })
  const system = useQuery({
    queryKey: ['agentgate', 'system'],
    queryFn: () => getAgentGate<System>('/api/system'),
  })

  const pending = home.data?.pending_verifications ?? []
  const anomalies = home.data?.anomalies ?? []
  const suggestions = home.data?.suggestions ?? []
  const recent = chats.data?.sessions?.slice(0, 3) ?? []
  const vitals = system.data?.vitals
  const isCalm = pending.length === 0 && anomalies.length === 0

  return (
    <>
      <AgentGateHeader />
      <Main>
        <section className='grid min-h-[calc(100dvh-7rem)] gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center'>
          <div className='relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm sm:p-10'>
            <div className='absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent' />
            <div className='grid gap-8 md:grid-cols-[minmax(0,1fr)_220px] md:items-center'>
              <div className='max-w-3xl'>
                <div className='mb-4 flex flex-wrap items-center gap-2'>
                  <Badge variant='secondary' className='rounded-full'>
                    <span className='mr-1.5 size-1.5 rounded-full bg-emerald-500' />
                    Hermes is ready
                  </Badge>
                  <span className='font-mono text-[11px] text-muted-foreground'>
                    local · private · owner-gated
                  </span>
                </div>
                <h1 className='max-w-2xl text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl'>
                  Command is quiet until something needs you.
                </h1>
                <p className='mt-4 max-w-2xl text-sm leading-6 text-muted-foreground'>
                  AgentGate is watching the active work, holding context, and
                  keeping the operational noise below the fold until you want
                  it.
                </p>
                <div className='mt-6 flex flex-wrap gap-2'>
                  <Button asChild>
                    <Link to='/chats'>
                      <MessageSquarePlus />
                      Start a conversation
                    </Link>
                  </Button>
                  <Button asChild variant='outline'>
                    <Link to='/approvals'>
                      <ShieldCheck />
                      Review decisions
                    </Link>
                  </Button>
                </div>
              </div>
              <div className='mx-auto flex flex-col items-center gap-4'>
                <Core />
                <p className='max-w-44 text-center font-mono text-[11px] leading-5 text-muted-foreground'>
                  core static · motion locked until approved
                </p>
              </div>
            </div>
          </div>

          <Card className='rounded-2xl'>
            <CardContent className='p-6'>
              <p className='font-mono text-[11px] tracking-wide text-muted-foreground uppercase'>
                Today
              </p>
              <div className='mt-5 grid grid-cols-3 gap-3 text-center'>
                <SoftNumber value={pending.length} label='decisions' />
                <SoftNumber value={anomalies.length} label='watching' />
                <SoftNumber value={recent.length} label='recent' />
              </div>
              <p className='mt-6 text-sm leading-6 text-muted-foreground'>
                {isCalm
                  ? 'Nothing is pressing. Hermes is ready when you are.'
                  : 'A few things are waiting, but none need to crowd the whole screen.'}
              </p>
            </CardContent>
          </Card>
        </section>

        <section id='command-deck' className='mt-10 scroll-mt-6'>
          <SectionHeading
            title='Command deck'
            detail='Everything observable, kept below the arrival room'
          />
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            <StatCard
              title='CPU'
              value={`${vitals?.cpu_percent ?? '—'}%`}
              note={`${vitals?.cpu_count ?? '—'} cores · 15 min`}
              icon={Server}
              history={histories.cpu}
            />
            <StatCard
              title='Memory'
              value={`${vitals?.memory.percent ?? '—'}%`}
              note='15.8 GB free · 15 min'
              icon={MemoryStick}
              history={histories.memory}
            />
            <StatCard
              title='Disk'
              value={`${vitals?.disk.percent ?? '—'}%`}
              note='428 GB free · 15 min'
              icon={HardDrive}
              history={histories.disk}
            />
            <StatCard
              title='Pending review'
              value={String(pending.length)}
              note='Owner decisions · 15 min'
              icon={ShieldCheck}
              history={histories.approvals}
            />
          </div>
        </section>

        <section className='mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]'>
          <div className='space-y-6'>
            <section>
              <SectionHeading
                title='Needs your attention'
                detail={`${pending.length} owner-gated action${
                  pending.length === 1 ? '' : 's'
                }`}
              />
              <div className='grid gap-3 md:grid-cols-2'>
                {pending.slice(0, 4).map((item) => (
                  <AttentionCard key={item.id} item={item} />
                ))}
              </div>
            </section>

            <section>
              <SectionHeading
                title='Good next moves'
                detail='Suggestions from current context'
              />
              <div className='grid gap-3 md:grid-cols-3'>
                {suggestions.slice(0, 3).map((item) => (
                  <SuggestionCard key={item.title} item={item} />
                ))}
              </div>
            </section>
          </div>

          <div className='space-y-6'>
            <section>
              <SectionHeading title='Continue' detail='Recent conversations' />
              <div className='space-y-2'>
                {recent.map((chat) => (
                  <Link
                    key={chat.id}
                    to='/chats/$id'
                    params={{ id: chat.id }}
                    className='block rounded-xl bg-card p-4 transition-colors hover:bg-muted/55'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='truncate text-sm font-medium'>
                          {chat.title}
                        </p>
                        <p className='mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground'>
                          {chat.preview}
                        </p>
                      </div>
                      <ArrowRight className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                    </div>
                    <p className='mt-3 font-mono text-[11px] text-muted-foreground'>
                      {relativeTime(chat.updated_at)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading title='Quiet signals' detail='Not urgent' />
              <div className='space-y-2'>
                {anomalies.slice(0, 3).map((item) => (
                  <div
                    key={item.label}
                    className='flex items-start gap-3 rounded-xl bg-card p-4'
                  >
                    <CircleAlert className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                    <div className='min-w-0'>
                      <p className='text-sm font-medium'>{item.label}</p>
                      <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <SectionHeading title='Live activity' detail='Recent events' />
              <div className='space-y-2 rounded-xl bg-card p-4'>
                {(home.data?.activity ?? []).map((event) => (
                  <p
                    key={event}
                    className='border-b pb-2 text-xs leading-5 text-muted-foreground last:border-0 last:pb-0'
                  >
                    {event}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </section>
      </Main>
    </>
  )
}

function SoftNumber({ value, label }: { value: number; label: string }) {
  return (
    <div className='rounded-xl bg-muted/35 px-3 py-4'>
      <p className='font-mono text-2xl font-semibold'>{value}</p>
      <p className='mt-1 text-[11px] text-muted-foreground'>{label}</p>
    </div>
  )
}

function StatCard({
  title,
  value,
  note,
  icon: Icon,
  history,
}: {
  title: string
  value: string
  note: string
  icon: typeof Activity
  history: number[]
}) {
  return (
    <Card>
      <CardContent className='p-5'>
        <div className='flex items-center justify-between gap-3'>
          <p className='text-sm font-medium'>{title}</p>
          <Icon className='size-4 text-muted-foreground' />
        </div>
        <div className='mt-3 font-mono text-2xl font-semibold tracking-tight'>
          {value}
        </div>
        <p className='text-xs text-muted-foreground'>{note}</p>
        <Sparkline values={history} className='mt-3 text-muted-foreground' />
      </CardContent>
    </Card>
  )
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div className='mb-3 flex items-end justify-between gap-4 border-b pb-3'>
      <div>
        <h2 className='text-sm font-medium'>{title}</h2>
        <p className='text-xs text-muted-foreground'>{detail}</p>
      </div>
    </div>
  )
}

function AttentionCard({ item }: { item: Approval }) {
  return (
    <div className='rounded-xl bg-card p-4'>
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
        <Button size='sm' variant='secondary'>
          <Check />
          Approve
        </Button>
        <Button
          size='sm'
          variant='outline'
          className='border-destructive text-destructive hover:bg-destructive hover:text-white'
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

function SuggestionCard({ item }: { item: Suggestion }) {
  return (
    <div className='rounded-xl bg-card p-4'>
      <div className='mb-3 flex items-center gap-2 text-muted-foreground'>
        <Sparkles className='size-4' />
        <span className='font-mono text-[11px]'>
          {item.confidence ?? 80}% confidence
        </span>
      </div>
      <p className='text-sm font-medium'>{item.title}</p>
      <p className='mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground'>
        {item.summary}
      </p>
    </div>
  )
}
