import { useQuery } from '@tanstack/react-query'
import { Lightbulb } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import { AgentGateHeader } from './page-header'

type Suggestion = {
  title: string
  summary: string
  theme?: string
  priority?: string
  confidence?: number
}
export function SuggestionsPage() {
  const query = useQuery({
    queryKey: ['agentgate', 'suggestions'],
    queryFn: () =>
      getAgentGate<{ suggestions: Suggestion[] }>('/api/suggestions'),
  })
  const groups = Object.entries(
    (query.data?.suggestions ?? []).reduce<Record<string, Suggestion[]>>(
      (grouped, item) => {
        const theme = item.theme ?? 'Other'
        grouped[theme] = [...(grouped[theme] ?? []), item]
        return grouped
      },
      {}
    )
  )
  return (
    <>
      <AgentGateHeader />
      <Main>
        <p className='mb-6 text-sm text-muted-foreground'>
          Potential next steps inferred from current context. Nothing runs from
          this list.
        </p>
        <div className='grid gap-8 xl:grid-cols-3'>
          {groups.map(([theme, items]) => (
            <section key={theme}>
              <div className='mb-4 border-b pb-3'>
                <h2 className='text-sm font-medium'>{theme}</h2>
                <p className='text-xs text-muted-foreground'>
                  {items?.length ?? 0} context-derived recommendations
                </p>
              </div>
              <div className='space-y-5'>
                {items?.map((item) => (
                  <div
                    key={item.title}
                    className='border-b pb-5 last:border-0 last:pb-0'
                  >
                    <div className='mb-2 flex items-start gap-3'>
                      <Lightbulb className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                      <p className='text-sm leading-5 font-medium'>
                        {item.title}
                      </p>
                    </div>
                    <div className='mb-2 flex gap-2 pl-7'>
                      <Badge
                        variant={
                          item.priority === 'high' ? 'destructive' : 'outline'
                        }
                      >
                        {item.priority ?? 'medium'} priority
                      </Badge>
                      <Badge variant='secondary'>
                        {item.confidence ?? 0}% confidence
                      </Badge>
                    </div>
                    <p className='pl-7 text-xs leading-5 text-muted-foreground'>
                      {item.summary}
                    </p>
                    <div className='mt-3 flex gap-1 pl-4'>
                      <Button variant='outline' size='sm'>
                        Ask agent
                      </Button>
                      <Button variant='ghost' size='sm'>
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </Main>
    </>
  )
}
