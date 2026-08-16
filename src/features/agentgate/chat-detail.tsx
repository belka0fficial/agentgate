import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Main } from '@/components/layout/main'
import { getAgentGate, relativeTime, type ChatMessage } from './api'
import { AgentGateHeader } from './page-header'

export function ChatDetailPage({ chatId }: { chatId: string }) {
  const conversation = useQuery({
    queryKey: ['agentgate', 'chats', chatId, 'messages'],
    queryFn: () => getAgentGate<{ messages: ChatMessage[] }>(`/api/chats/${chatId}/messages`),
  })

  return <><AgentGateHeader /><Main className='max-w-4xl'>
    <div className='mb-6 flex items-center justify-between gap-4'>
      <div><h1 className='text-2xl font-bold tracking-tight'>Release readiness review</h1><p className='text-sm text-muted-foreground'><code className='font-mono'>{chatId}</code> · private session</p></div>
      <Button asChild variant='outline'><Link to='/chats'><ArrowLeft />All chats</Link></Button>
    </div>
    <Card>
      <CardHeader><CardTitle>Conversation</CardTitle><CardDescription>Hermes retains context for this session only.</CardDescription></CardHeader>
      <CardContent className='space-y-5'>
        {(conversation.data?.messages ?? []).map((message) => <div key={message.id} className={message.role === 'owner' ? 'ml-auto max-w-[85%]' : 'max-w-[85%]'}>
          <div className={message.role === 'owner' ? 'rounded-lg bg-primary p-4 text-primary-foreground' : 'rounded-lg bg-muted p-4'}><p className='whitespace-pre-wrap text-sm leading-6'>{message.content}</p></div>
          <p className='mt-1 px-1 font-mono text-xs text-muted-foreground'>{message.role === 'owner' ? 'Owner' : 'Hermes'} · {relativeTime(message.created_at)}</p>
        </div>)}
      </CardContent>
    </Card>
    <Card className='mt-4'>
      <CardHeader><CardTitle>Reply</CardTitle><CardDescription>Your message stays in this session unless an explicit action is approved.</CardDescription></CardHeader>
      <CardContent><form className='space-y-3'><Textarea placeholder='Message Hermes…' className='min-h-28' /><div className='flex justify-end'><Button type='submit'><Send />Send</Button></div></form></CardContent>
    </Card>
  </Main></>
}
