import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { getAgentGate, relativeTime, type ChatSession } from './api'
import { AgentGateHeader } from './page-header'

export function ChatsPage() {
  const chats = useQuery({
    queryKey: ['agentgate', 'chats'],
    queryFn: () => getAgentGate<{ sessions: ChatSession[] }>('/api/chats'),
  })
  const rows = chats.data?.sessions ?? []

  return (
    <>
      <AgentGateHeader />
      <Main>
        <div className='mb-6'>
          <p className='text-sm text-muted-foreground'>
            Start a new conversation or continue a recent session.
          </p>
        </div>
        <section>
          <div className='mb-4 border-b pb-3'>
            <h2 className='text-sm font-medium'>Recent sessions</h2>
            <p className='text-xs text-muted-foreground'>
              Your private conversation history, ordered by latest activity.
            </p>
          </div>
          <Table>
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
                          {row.model ?? 'gpt-5.2'}
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
        </section>
      </Main>
    </>
  )
}

function sessionContextLabel(mode?: string) {
  if (mode === 'incognito') return 'deep search'
  return mode ?? 'operator'
}
