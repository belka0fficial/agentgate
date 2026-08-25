import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
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
import { getAgentGate, postAgentGate, relativeTime, type ChatSession } from './api'
import { AgentGateHeader } from './page-header'

export function ChatsPage() {
  const navigate = useNavigate()
  const chats = useQuery({
    queryKey: ['agentgate', 'chats'],
    queryFn: () => getAgentGate<{ sessions: ChatSession[] }>('/api/chats'),
  })
  const rows = chats.data?.sessions ?? []
  const createChat = useMutation({
    mutationFn: () =>
      postAgentGate<ChatSession>('/api/sessions', {
        title: 'New AgentGate conversation',
        agent_id: 'agent_pi_operator',
      }),
    onSuccess: (session) => {
      void navigate({ to: '/chats/$id', params: { id: session.id } })
    },
  })

  return (
    <>
      <AgentGateHeader />
      <Main fluid className='px-4 sm:px-6'>
        <section className='w-full overflow-x-auto'>
          <div className='mb-4 flex items-end justify-between gap-4 border-b pb-3'>
            <div>
              <h2 className='text-sm font-medium'>Recent sessions</h2>
              <p className='text-xs text-muted-foreground'>
                Private Pi adapter conversations, ordered by latest activity.
              </p>
            </div>
            <Button
              type='button'
              size='sm'
              onClick={() => createChat.mutate()}
              disabled={createChat.isPending}
            >
              New chat
            </Button>
          </div>
          {createChat.error ? (
            <div className='mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
              {createChat.error instanceof Error
                ? createChat.error.message
                : 'Could not create chat'}
            </div>
          ) : null}
          {rows.length === 0 ? (
            <div className='rounded-xl border bg-card p-8 text-sm text-muted-foreground'>
              No Pi sessions yet. Start a new chat to create one.
            </div>
          ) : (
          <Table className='min-w-[900px]'>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Last message</TableHead>
                <TableHead>Run context</TableHead>
                <TableHead>Turns</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.id}
                  className='cursor-pointer hover:bg-muted/45'
                >
                  <TableCell className='p-0' colSpan={5}>
                    <Link
                      to='/chats/$id'
                      params={{ id: row.id }}
                      className='grid min-w-0 grid-cols-[minmax(180px,1.2fr)_minmax(240px,2fr)_minmax(160px,1fr)_100px_120px] items-center gap-4 px-2 py-4 text-sm'
                      aria-label={`Open ${row.title}`}
                    >
                      <span className='min-w-0 font-medium'>{row.title}</span>
                      <span className='min-w-0 truncate text-muted-foreground'>
                        {row.preview}
                      </span>
                      <span className='flex min-w-0 flex-wrap gap-1'>
                        <Badge variant='outline'>
                          {row.model ?? 'provider pending'}
                        </Badge>
                        <Badge variant='secondary'>
                          {sessionContextLabel(row.mode)}
                        </Badge>
                      </span>
                      <code className='font-mono text-xs'>
                        {row.message_count ?? '—'}
                      </code>
                      <code className='font-mono text-xs text-muted-foreground'>
                        {relativeTime(row.updated_at)}
                      </code>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </section>
      </Main>
    </>
  )
}

function sessionContextLabel(mode?: string) {
  if (mode === 'incognito') return 'deep search'
  return mode ?? 'operator'
}
