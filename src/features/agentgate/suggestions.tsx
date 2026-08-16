import { useQuery } from '@tanstack/react-query'
import { Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import { AgentGateHeader } from './page-header'

type Suggestion = { title: string; summary: string }
export function SuggestionsPage() {
  const query = useQuery({ queryKey: ['agentgate', 'suggestions'], queryFn: () => getAgentGate<{ suggestions: Suggestion[] }>('/api/suggestions') })
  return <><AgentGateHeader /><Main className='max-w-5xl'><div className='mb-6'><h1 className='text-2xl font-bold tracking-tight'>Suggestions</h1><p className='text-sm text-muted-foreground'>Potential next steps inferred from current context. Nothing runs from this list.</p></div><Card><CardHeader><CardTitle>Suggested next</CardTitle><CardDescription>Review context first, then ask Hermes to prepare a bounded plan.</CardDescription></CardHeader><CardContent className='space-y-5'>{(query.data?.suggestions ?? []).map((item) => <div key={item.title} className='flex items-start gap-4 border-b pb-5 last:border-0 last:pb-0'><Lightbulb className='mt-0.5 size-5 text-muted-foreground' /><div className='min-w-0 flex-1'><p className='font-medium'>{item.title}</p><p className='mt-1 text-sm leading-6 text-muted-foreground'>{item.summary}</p></div><div className='flex shrink-0 gap-2'><Button variant='outline' size='sm'>Ask agent</Button><Button variant='ghost' size='sm'>Dismiss</Button></div></div>)}</CardContent></Card></Main></>
}
