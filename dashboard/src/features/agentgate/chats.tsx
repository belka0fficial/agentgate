import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import {
  getAgentGate,
  loginAgentGateOwner,
  postAgentGate,
  relativeTime,
  type ChatMutationResult,
  type ChatSession,
} from './api'
import { filterAndSortChatSessions, type ChatSort } from './chat-controls-model'
import { AgentGateHeader } from './page-header'

export function ChatsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [ownerToken, setOwnerToken] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState<ChatSort>('updated-desc')
  const chats = useQuery({
    queryKey: ['agentgate', 'chats'],
    queryFn: () => getAgentGate<{ sessions: ChatSession[] }>('/api/chats'),
  })
  const sourceRows = chats.data?.sessions
  const rows = useMemo(
    () =>
      filterAndSortChatSessions(sourceRows ?? [], {
        query: searchQuery,
        sort: sortOrder,
      }),
    [sourceRows, searchQuery, sortOrder]
  )
  const needsOwnerLogin =
    chats.error instanceof Error &&
    chats.error.message.toLowerCase().includes('owner authentication')
  const loginOwner = useMutation({
    mutationFn: () => loginAgentGateOwner(ownerToken),
    onSuccess: async () => {
      setOwnerToken('')
      await queryClient.invalidateQueries({ queryKey: ['agentgate', 'chats'] })
    },
  })
  const createChat = useMutation({
    mutationFn: () =>
      postAgentGate<ChatMutationResult>('/api/chats', {
        title: 'New AgentGate conversation',
        agent_id: 'agent_pi_operator',
      }),
    onSuccess: (result) => {
      const sessionId = result.session?.id ?? result.id
      if (sessionId) {
        void navigate({ to: '/chats/$id', params: { id: sessionId } })
      }
    },
  })

  return (
    <>
      <AgentGateHeader />
      <Main fluid className='px-4 sm:px-6'>
        <section className='w-full overflow-x-auto' aria-busy={chats.isLoading}>
          <div className='mb-4 flex items-end justify-between gap-4 border-b pb-3'>
            <div>
              <h2 className='text-sm font-medium'>Recent sessions</h2>
              <p className='text-xs text-muted-foreground'>
                Private Pi adapter conversations from /api/chats. Counts are
                shown only when the source supplies them.
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
          <div className='mb-4 grid gap-3 rounded-xl border bg-card p-3 sm:grid-cols-[minmax(0,1fr)_220px]'>
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder='Search title, preview, model, mode, or session id'
              aria-label='Search chats'
            />
            <select
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value as ChatSort)}
              className='h-9 rounded-md border bg-background px-3 text-sm'
              aria-label='Sort chats'
            >
              <option value='updated-desc'>Latest activity first</option>
              <option value='updated-asc'>Oldest activity first</option>
              <option value='title-asc'>Title A-Z</option>
              <option value='turns-desc'>Turns high-low</option>
            </select>
            <p className='text-xs text-muted-foreground sm:col-span-2'>
              Showing {rows.length} of {(sourceRows ?? []).length} source
              sessions. No synthetic totals are generated.
            </p>
          </div>
          {chats.isLoading ? (
            <div className='rounded-xl border bg-card p-8 text-sm text-muted-foreground'>
              Loading sessions from Pi adapter...
            </div>
          ) : chats.error && !needsOwnerLogin ? (
            <div className='rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'>
              Chat source degraded. Sessions could not be loaded.
            </div>
          ) : needsOwnerLogin ? (
            <form
              className='mb-4 grid gap-3 rounded-xl border bg-card p-4 text-sm'
              onSubmit={(event) => {
                event.preventDefault()
                if (ownerToken.trim()) loginOwner.mutate()
              }}
            >
              <div>
                <h3 className='font-medium'>Owner login required</h3>
                <p className='text-xs text-muted-foreground'>
                  Enter the owner token to query the Pi adapter and receive an
                  httpOnly session cookie. The token is sent only to{' '}
                  <code>/api/auth/login</code> and is not stored in localStorage
                  or bundled into the app.
                </p>
              </div>
              <div className='flex gap-2'>
                <Input
                  type='password'
                  value={ownerToken}
                  onChange={(event) => setOwnerToken(event.target.value)}
                  placeholder='Owner token'
                  autoComplete='off'
                />
                <Button
                  type='submit'
                  disabled={!ownerToken.trim() || loginOwner.isPending}
                >
                  Connect
                </Button>
              </div>
              {loginOwner.error ? (
                <p className='text-xs text-destructive'>
                  {loginOwner.error instanceof Error
                    ? loginOwner.error.message
                    : 'Owner login failed'}
                </p>
              ) : null}
            </form>
          ) : !needsOwnerLogin &&
            (sourceRows ?? []).length > 0 &&
            rows.length === 0 ? (
            <div className='rounded-xl border bg-card p-8 text-sm text-muted-foreground'>
              No source sessions match this filter.
            </div>
          ) : !needsOwnerLogin && rows.length === 0 ? (
            <div className='rounded-xl border bg-card p-8 text-sm text-muted-foreground'>
              No Pi sessions yet. Start a new chat to create one.
            </div>
          ) : !needsOwnerLogin ? (
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
          ) : null}
        </section>
      </Main>
    </>
  )
}

function sessionContextLabel(mode?: string) {
  if (mode === 'incognito') return 'incognito reported'
  return mode ?? 'operator'
}
