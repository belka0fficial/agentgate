import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  type LucideIcon,
  ArrowRight,
  Check,
  ChevronDown,
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
import { buildCommandStatCards, type CommandStatCard } from './command-cards'
import { Core } from './core'
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
  const statCards = buildCommandStatCards(system.data)
  const isCalm = pending.length === 0 && anomalies.length === 0

  return (
    <>
      <AgentGateHeader />
      <Main fluid className='px-4 sm:px-6'>
        <section className='relative isolate min-h-[calc(100dvh-6rem)] overflow-hidden pb-16'>
          <div className='pointer-events-none absolute top-1/2 right-[4%] -z-10 size-[min(62vw,760px)] -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(117,139,176,0.07),transparent_64%)] blur-2xl' />
          <div className='grid min-h-[calc(100dvh-10rem)] items-center gap-6 lg:grid-cols-[minmax(380px,0.72fr)_minmax(520px,1.28fr)]'>
            <div className='z-10 flex max-w-xl flex-col gap-4 py-8 lg:pl-[clamp(0rem,3vw,3rem)]'>
              <div className='relative overflow-hidden rounded-2xl border bg-card/85 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8'>
                <div className='absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-foreground/20 to-transparent' />
                <div className='mb-4 flex flex-wrap items-center gap-2'>
                  <Badge variant='secondary' className='rounded-full'>
                    <span className='mr-1.5 size-1.5 rounded-full bg-muted-foreground/60' />
                    Runtime status unknown
                  </Badge>
                  <span className='font-mono text-[11px] text-muted-foreground'>
                    local · private · owner-gated
                  </span>
                </div>
                <h1 className='max-w-lg text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl'>
                  Command is quiet until something needs you.
                </h1>
                <p className='mt-4 max-w-lg text-sm leading-6 text-muted-foreground'>
                  Source-bound AgentGate status appears here. Unknown, empty,
                  degraded, and offline states are shown honestly instead of
                  pretending the stack is healthy.
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

              <Card className='rounded-2xl bg-card/70 backdrop-blur-sm'>
                <CardContent className='grid items-center gap-5 p-5 sm:grid-cols-[auto_1fr]'>
                  <div>
                    <p className='font-mono text-[11px] tracking-wide text-muted-foreground uppercase'>
                      Today
                    </p>
                    <p className='mt-2 max-w-44 text-xs leading-5 text-muted-foreground'>
                      {isCalm
                        ? 'Nothing is pressing.'
                        : 'A few things are waiting.'}
                    </p>
                  </div>
                  <div className='grid grid-cols-3 gap-2 text-center'>
                    <SoftNumber value={pending.length} label='decisions' />
                    <SoftNumber value={anomalies.length} label='watching' />
                    <SoftNumber value={recent.length} label='recent' />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className='relative flex min-h-[440px] items-center justify-center lg:min-h-0'>
              <div className='pointer-events-none absolute h-px w-[76%] bg-gradient-to-r from-transparent via-border/45 to-transparent' />
              <div className='pointer-events-none absolute h-[76%] w-px bg-gradient-to-b from-transparent via-border/35 to-transparent' />
              <div className='flex flex-col items-center gap-2'>
                <Core className='size-[340px] sm:size-[420px] lg:size-[500px]' />
                <p className='text-center font-mono text-[10px] tracking-[0.12em] text-muted-foreground uppercase'>
                  text-first foundation · presence deferred
                </p>
              </div>
            </div>
          </div>

          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full text-muted-foreground hover:text-foreground'
            onClick={() =>
              document
                .getElementById('command-deck')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Open command deck
            <ChevronDown />
          </Button>
        </section>

        <section id='command-deck' className='mt-10 scroll-mt-6'>
          <SectionHeading
            title='Command deck'
            detail='Everything observable, kept below the arrival room'
          />
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {statCards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                note={card.note}
                icon={
                  card.title === 'CPU'
                    ? Server
                    : card.title === 'Memory'
                      ? MemoryStick
                      : HardDrive
                }
              />
            ))}
            <StatCard
              title='Pending review'
              value={String(pending.length)}
              note='Owner decisions · current sample'
              icon={ShieldCheck}
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
}: Omit<CommandStatCard, 'title'> & {
  title: string
  icon: LucideIcon
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
