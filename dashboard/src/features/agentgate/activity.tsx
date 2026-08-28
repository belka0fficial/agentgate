import { useQuery } from '@tanstack/react-query'
import { CircleDot } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import { AgentGateHeader } from './page-header'

type ActivityResponse = {
  activity?: string[]
  source_status?: Record<string, { status?: string; source?: string }>
}

export function ActivityPage() {
  const query = useQuery({
    queryKey: ['agentgate', 'activity'],
    queryFn: () => getAgentGate<ActivityResponse>('/api/home'),
  })
  const activity = Array.isArray(query.data?.activity)
    ? query.data.activity
    : []
  const state = query.isLoading
    ? 'loading'
    : query.error
      ? 'degraded'
      : activity.length
        ? 'live'
        : 'empty'

  return (
    <>
      <AgentGateHeader title='Activity' eyebrow='Agent and system activity' />
      <Main>
        <div className='mb-6 flex items-start justify-between gap-4'>
          <div className='max-w-3xl'>
            <h2 className='text-xl font-semibold tracking-[-0.02em]'>
              Activity
            </h2>
            <p className='mt-1 text-sm leading-6 text-muted-foreground'>
              Source-bound activity reported by AgentGate Home aggregation.
              Agent labels and safe action summaries may appear here; raw
              prompts, hidden instructions, tool arguments, results, and logs
              remain server-side.
            </p>
          </div>
          <Badge variant={state === 'degraded' ? 'destructive' : 'outline'}>
            {state}
          </Badge>
        </div>

        {query.isLoading ? (
          <div className='rounded-lg border px-4 py-8 text-sm text-muted-foreground'>
            Loading activity from AgentGate…
          </div>
        ) : query.error ? (
          <div className='rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
            Activity source unavailable. No events are being inferred locally.
          </div>
        ) : activity.length === 0 ? (
          <div className='flex min-h-52 flex-col items-center justify-center rounded-lg border text-center'>
            <CircleDot className='size-5 text-muted-foreground' />
            <h3 className='mt-3 text-sm font-medium'>No activity reported</h3>
            <p className='mt-1 max-w-md text-xs leading-5 text-muted-foreground'>
              AgentGate returned an empty activity collection. This screen will
              populate only when a real source reports agent or system work.
            </p>
          </div>
        ) : (
          <ol className='divide-y overflow-hidden rounded-lg border bg-card'>
            {activity.map((item, index) => (
              <li key={`${index}-${item}`} className='flex gap-3 px-4 py-3'>
                <CircleDot className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                <p className='text-sm leading-6'>{item}</p>
              </li>
            ))}
          </ol>
        )}
      </Main>
    </>
  )
}
