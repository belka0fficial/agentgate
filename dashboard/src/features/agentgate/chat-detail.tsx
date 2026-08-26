import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import {
  ArrowUp,
  Brain,
  Clipboard,
  Download,
  EyeOff,
  FileText,
  FilePenLine,
  GitFork,
  Globe,
  Library,
  MoreHorizontal,
  Paperclip,
  Pencil,
  RotateCcw,
  Share2,
  SlidersHorizontal,
  Square,
  Trash2,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Main } from '@/components/layout/main'
import {
  getAgentGate,
  postAgentGate,
  relativeTime,
  type ChatMessage,
} from './api'
import {
  chatActionAvailability,
  forkPayloadForMessage,
  safeChatUiError,
  streamChatBody,
} from './chat-controls-model'
import { personas } from './personas'

const chatStates = [
  'default',
  'streaming',
  'tool',
  'approval',
  'empty',
  'stopped',
  'failed',
  'lost',
  'artifact',
  'selection',
] as const

type ChatState = (typeof chatStates)[number]
type ChatSessionFork = { id?: string }

export function ChatDetailPage({ chatId }: { chatId: string }) {
  const [quoteDraft, setQuoteDraft] = useState('')
  const [selectionChip, setSelectionChip] = useState<{
    text: string
    x: number
    y: number
    chatState: ChatState
  } | null>(null)
  const [selectionNotice, setSelectionNotice] = useState('')
  const [forkError, setForkError] = useState('')
  const [showJumpToLatest, setShowJumpToLatest] = useState(false)
  const threadViewportRef = useRef<HTMLDivElement>(null)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const isPinnedToLatestRef = useRef(true)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const locationHref = useLocation({
    select: (location) => location.href,
  })
  const chatState = getChatStateFromHref(locationHref)
  const conversation = useQuery({
    queryKey: ['agentgate', 'chats', chatId, 'messages'],
    queryFn: () =>
      getAgentGate<{ messages: ChatMessage[] }>(
        `/api/chats/${chatId}/messages`
      ),
  })

  const scrollThreadToLatest = useCallback(
    (behavior: ScrollBehavior = 'auto') => {
      const viewport = threadViewportRef.current
      if (!viewport) return

      viewport.scrollTo({
        top: viewport.scrollHeight,
        behavior,
      })
      isPinnedToLatestRef.current = true
      setShowJumpToLatest(false)
    },
    []
  )

  function handleThreadScroll() {
    const viewport = threadViewportRef.current
    if (!viewport) return

    const distanceFromBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
    const isAtLatest = distanceFromBottom < 96
    isPinnedToLatestRef.current = isAtLatest
    setShowJumpToLatest(!isAtLatest)
  }

  async function handleForkFromMessage(message: ChatMessage) {
    setForkError('')
    try {
      const fork = await postAgentGate<ChatSessionFork>(
        `/api/chats/${chatId}/fork`,
        forkPayloadForMessage(message)
      )
      if (fork.id) {
        void navigate({ to: '/chats/$id', params: { id: fork.id } })
      } else {
        setForkError('Fork route returned no session id.')
      }
    } catch (error) {
      setForkError(safeChatUiError(error))
    }
  }

  function handleThreadSelection() {
    const selection = window.getSelection()
    const text = selection?.toString().trim()
    if (!selection || !text || text.length < 2) {
      if (chatState !== 'selection') setSelectionChip(null)
      return
    }
    const range = selection.getRangeAt(0)
    const rect = range.getBoundingClientRect()
    setSelectionChip({
      text,
      x: Math.min(rect.left + rect.width / 2, window.innerWidth - 160),
      y: Math.max(rect.top - 42, 72),
      chatState,
    })
  }

  const messages =
    conversation.data?.messages && chatState !== 'empty'
      ? conversation.data.messages
      : []

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (isPinnedToLatestRef.current) {
        scrollThreadToLatest('auto')
      } else {
        setShowJumpToLatest(true)
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [messages.length, chatState, scrollThreadToLatest])

  return (
    <div
      data-ui='chat-shell'
      className='flex h-[100dvh] min-h-0 flex-col overflow-hidden'
    >
      <Main fixed fluid className='min-h-0 flex-1 overflow-hidden py-0'>
        <div className='grid h-full min-h-0 w-full min-w-0 overflow-hidden'>
          <div className='flex min-h-0 min-w-0 flex-col overflow-hidden'>
            <div className='mx-auto w-full max-w-[1200px] shrink-0 px-4 pt-6 pb-4 sm:px-6'>
              <div className='flex min-w-0 items-start justify-between gap-4'>
                <div className='min-w-0'>
                  <h1 className='truncate text-2xl font-bold tracking-tight'>
                    AgentGate conversation
                  </h1>
                  <p className='truncate font-mono text-xs text-muted-foreground'>
                    {chatId} - private Pi session - {messages.length} turns
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                  <SessionActionsMenu />
                </div>
              </div>
            </div>
            {forkError ? (
              <div className='mx-auto mb-2 w-full max-w-[1200px] px-4 text-xs text-destructive sm:px-6'>
                {forkError}
              </div>
            ) : null}
            <div
              ref={threadViewportRef}
              data-ui='chat-thread'
              className='min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [scrollbar-gutter:stable]'
              onScroll={handleThreadScroll}
              onMouseUp={handleThreadSelection}
            >
              <div className='mx-auto flex min-h-full w-full max-w-[1200px] min-w-0 flex-col px-4 pt-6 pb-8 sm:px-6'>
                <div className='min-w-0 flex-1'>
                  {messages.length ? (
                    messages.map((message, index) => (
                      <div
                        key={message.id}
                        className='min-w-0 border-b border-border/45'
                      >
                        <MessageRow
                          message={message}
                          onFork={(message) =>
                            void handleForkFromMessage(message)
                          }
                        />
                        <StateInlineSurface
                          state={chatState}
                          message={message}
                          index={index}
                          onOpenArtifact={() => undefined}
                        />
                      </div>
                    ))
                  ) : (
                    <EmptySession onPrompt={setQuoteDraft} />
                  )}
                  <RunStateSurface state={chatState} />
                  <div ref={threadEndRef} aria-hidden='true' />
                </div>
              </div>
              {showJumpToLatest ? (
                <Button
                  type='button'
                  size='sm'
                  variant='secondary'
                  className='sticky bottom-4 left-1/2 z-10 mx-auto flex -translate-x-1/2 rounded-full shadow-lg'
                  onClick={() => scrollThreadToLatest('smooth')}
                >
                  Jump to latest
                </Button>
              ) : null}
            </div>
            <div
              data-ui='chat-composer-slot'
              className='mx-auto w-full max-w-[1200px] shrink-0 px-4 sm:px-6'
            >
              <Composer
                chatId={chatId}
                quoteDraft={quoteDraft}
                onQuoteConsumed={() => setQuoteDraft('')}
                isStreaming={chatState === 'streaming'}
                onSend={async () => {
                  await queryClient.invalidateQueries({
                    queryKey: ['agentgate', 'chats', chatId, 'messages'],
                  })
                  scrollThreadToLatest('smooth')
                }}
              />
            </div>
          </div>
        </div>
      </Main>
      {selectionChip && selectionChip.chatState === chatState ? (
        <SelectionChip
          selection={selectionChip}
          onQuote={() => {
            setSelectionNotice(
              'Selected-text reply is planned until a backend message-span schema exists.'
            )
            setSelectionChip(null)
            window.getSelection()?.removeAllRanges()
          }}
          onCopy={(text) => navigator.clipboard?.writeText(text)}
          onMemory={() => {
            setSelectionNotice(
              'Selected-text memory capture is planned until an approval contract exists.'
            )
            setSelectionChip(null)
          }}
        />
      ) : null}
      {selectionNotice ? (
        <div className='fixed right-4 bottom-4 z-50 rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md'>
          {selectionNotice}
        </div>
      ) : null}
    </div>
  )
}

function MessageRow({
  message,
  onFork,
}: {
  message: ChatMessage
  onFork: (message: ChatMessage) => void
}) {
  const isOwner = message.role === 'owner'

  return (
    <article className='group grid min-w-0 gap-2 py-4 sm:grid-cols-[84px_minmax(0,1fr)] sm:gap-5'>
      <div className='pt-0.5 font-mono text-[11px] tracking-wide text-muted-foreground uppercase'>
        {isOwner ? 'You' : 'Hermes'}
      </div>
      <div className='min-w-0'>
        <div
          className={
            isOwner
              ? 'rounded-lg bg-muted/40 px-4 py-3 text-sm leading-6 font-normal break-words whitespace-pre-wrap'
              : 'text-sm leading-6 font-normal break-words whitespace-pre-wrap'
          }
        >
          {message.content}
        </div>
        <div className='mt-1.5 flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap opacity-45 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'>
          <MessageMeta message={message} onFork={() => onFork(message)} />
        </div>
      </div>
    </article>
  )
}

function getChatStateFromHref(href: string): ChatState {
  const value = new URL(href, 'http://agentgate.local').searchParams.get(
    'state'
  )

  return chatStates.includes(value as ChatState)
    ? (value as ChatState)
    : 'default'
}

function StateInlineSurface({
  state,
  message,
  index,
  onOpenArtifact,
}: {
  state: ChatState
  message: ChatMessage
  index: number
  onOpenArtifact: () => void
}) {
  if (state === 'streaming' && message.id === 'msg_stream')
    return <StreamingCursor />
  if (state === 'tool' && message.id === 'msg_02') return <InlineToolCall />
  if (state === 'approval' && message.id === 'msg_04')
    return (
      <p className='text-xs text-muted-foreground'>
        Approval request available in Verifications.
      </p>
    )
  if (state === 'artifact' && message.id === 'msg_06')
    return <ArtifactCard onOpen={onOpenArtifact} />
  if (state === 'selection' && index === 1)
    return (
      <p className='font-mono text-[11px] text-muted-foreground'>
        Select any passage in the message above to reveal quote, copy, and
        memory actions.
      </p>
    )
  return null
}

function StreamingCursor() {
  return (
    <div className='max-w-[72ch] font-mono text-[11px] text-muted-foreground'>
      <span className='mr-2 inline-block size-1.5 animate-pulse rounded-full bg-primary' />
      tokens streaming
      <span className='ml-1 inline-block h-4 w-px animate-pulse bg-primary align-middle' />
    </div>
  )
}

function InlineToolCall() {
  return (
    <div className='max-w-[72ch] rounded-lg bg-muted/35 px-3 py-2 text-xs text-muted-foreground'>
      Tool activity is available as metadata only; arguments and results are
      withheld.
    </div>
  )
}

function ArtifactCard({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      type='button'
      className='block max-w-[72ch] rounded-xl border bg-muted/35 p-4 text-left transition-colors hover:bg-muted/50'
      onClick={onOpen}
    >
      <div className='flex items-start gap-3'>
        <div className='rounded-md bg-background/50 p-2 text-muted-foreground'>
          <FileText className='size-5' />
        </div>
        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-2'>
            <p className='truncate text-sm font-medium'>release-readiness.md</p>
            <Badge variant='secondary'>v2</Badge>
          </div>
          <p className='mt-1 font-mono text-[11px] text-muted-foreground'>
            markdown - 2.8 KB - 84 lines - revised draft
          </p>
          <pre className='mt-3 overflow-hidden rounded-md bg-background/40 p-3 text-xs text-muted-foreground'>
            {`# Release readiness
- checks green
- public changelog approval pending
- token rotation queued`}
          </pre>
        </div>
      </div>
    </button>
  )
}

function RunStateSurface({ state }: { state: ChatState }) {
  if (state === 'stopped')
    return (
      <InlineRunNotice
        tone='muted'
        text='Stopped by you. Partial output retained.'
        actions={['Resume planned', 'Regenerate planned']}
      />
    )
  if (state === 'failed')
    return (
      <InlineRunNotice
        tone='destructive'
        text='The run failed while writing the draft. Nothing was published.'
        actions={['Retry unavailable']}
      />
    )
  if (state === 'lost')
    return (
      <InlineRunNotice
        tone='muted'
        icon={<WifiOff />}
        text='Connection lost mid-stream. Data is stale; retry is unavailable.'
        actions={['Retry unavailable']}
      />
    )
  return null
}

function InlineRunNotice({
  text,
  actions,
  icon,
  tone,
}: {
  text: string
  actions: string[]
  icon?: React.ReactNode
  tone: 'muted' | 'destructive'
}) {
  return (
    <div
      className={`flex max-w-[72ch] items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ${
        tone === 'destructive'
          ? 'border-destructive/40 text-destructive'
          : 'text-muted-foreground'
      }`}
    >
      <div className='flex items-center gap-2'>
        {icon}
        <span>{text}</span>
      </div>
      <div className='flex gap-1'>
        {actions.map((action) => (
          <Button
            key={action}
            type='button'
            size='sm'
            variant='ghost'
            disabled={
              action.toLowerCase().includes('planned') ||
              action.toLowerCase().includes('unavailable')
            }
          >
            {action}
          </Button>
        ))}
      </div>
    </div>
  )
}

function EmptySession({ onPrompt }: { onPrompt: (prompt: string) => void }) {
  const prompts = [
    'Review the 4 pending approvals',
    'Explain the stale backup anomaly',
    'Summarize recent release memories',
    'Draft a safe automation plan',
  ]

  return (
    <div className='flex min-h-[420px] flex-col items-center justify-center text-center'>
      <h2 className='text-xl font-semibold'>What should Hermes inspect?</h2>
      <p className='mt-2 max-w-md text-sm text-muted-foreground'>
        Start from live context: approvals, anomalies, memories, and automation
        state.
      </p>
      <div className='mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2'>
        {prompts.map((prompt) => (
          <Button
            key={prompt}
            type='button'
            variant='outline'
            className='justify-start text-left'
            onClick={() => onPrompt(prompt)}
          >
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  )
}

function SelectionChip({
  selection,
  onQuote,
  onCopy,
  onMemory,
}: {
  selection: { text: string; x: number; y: number }
  onQuote: (text: string) => void
  onCopy: (text: string) => void
  onMemory: (text: string) => void
}) {
  return (
    <div
      className='fixed z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border bg-popover p-1 text-xs text-popover-foreground shadow-md'
      style={{ left: selection.x, top: selection.y }}
    >
      <Button
        type='button'
        size='sm'
        variant='ghost'
        onClick={() => onQuote(selection.text)}
      >
        Reply planned
      </Button>
      <Button
        type='button'
        size='sm'
        variant='ghost'
        onClick={() => onCopy(selection.text)}
      >
        Copy
      </Button>
      <Button
        type='button'
        size='sm'
        variant='ghost'
        onClick={() => onMemory(selection.text)}
      >
        Memory planned
      </Button>
    </div>
  )
}

function getForkPrefill(_chatId: string) {
  return ''
}
async function streamChatTurn(
  sessionId: string,
  input: string,
  options: {
    memoryIncognito: boolean
    reasoning: string
  }
) {
  const response = await fetch(`/api/chats/${sessionId}/stream`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      'X-CSRF-Token':
        document.cookie
          .split('; ')
          .find((row) => row.startsWith('agentgate_csrf='))
          ?.split('=')[1] ?? '',
    },
    body: JSON.stringify(streamChatBody(input, options)),
  })

  if (!response.ok) {
    await response.text()
    throw new Error('Chat stream failed')
  }

  if (!response.body) return
  const reader = response.body.getReader()
  try {
    while (true) {
      const { done } = await reader.read()
      if (done) break
    }
  } finally {
    reader.releaseLock()
  }
}

function Composer({
  chatId,
  quoteDraft,
  onQuoteConsumed,
  isStreaming = false,
  onSend,
}: {
  chatId: string
  quoteDraft?: string
  onQuoteConsumed?: () => void
  isStreaming?: boolean
  onSend?: () => void
}) {
  const [value, setValue] = useState(() => getForkPrefill(chatId))
  const [memoryIncognito, setMemoryIncognito] = useState(false)
  const [reasoning, setReasoning] = useState('medium')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className='z-20 bg-background/95 pt-3 pb-5 backdrop-blur'>
      <form
        data-ui='chat-composer'
        className='overflow-hidden rounded-xl border bg-muted/55 shadow-lg shadow-background'
        onSubmit={(event) => {
          event.preventDefault()
          const input = value.trim()
          if (!input || sending) return
          setSending(true)
          setSendError('')
          setValue('')
          streamChatTurn(chatId, input, {
            memoryIncognito,
            reasoning,
          })
            .then(() => onSend?.())
            .catch((error: unknown) => {
              setSendError(
                error instanceof Error ? error.message : 'Chat request failed'
              )
              setValue(input)
            })
            .finally(() => setSending(false))
          onQuoteConsumed?.()
        }}
      >
        {quoteDraft ? (
          <QuoteChip
            label='Replying to Hermes · msg_06'
            text={quoteDraft}
            onRemove={() => onQuoteConsumed?.()}
          />
        ) : null}
        {sendError ? (
          <div className='border-b px-4 py-2 text-xs text-destructive'>
            {sendError}
          </div>
        ) : null}
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder='Message Hermes...'
          className='max-h-[200px] min-h-14 resize-none overflow-y-auto rounded-none border-0 !bg-transparent px-4 py-3 shadow-none focus-visible:ring-0 dark:!bg-transparent'
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              event.currentTarget.form?.requestSubmit()
            }
          }}
        />
        <div className='flex flex-wrap items-center gap-1 bg-transparent px-2 py-2'>
          <InlineSelect
            disabled
            value='gpt-5.2'
            items={['gpt-5.2', 'gpt-5.2-mini', 'o4-mini']}
            label='Model'
          />
          <InlineSelect
            value='Hermes'
            items={personas.map((persona) => persona.name)}
            label='Persona'
          />
          <CapabilityPopover
            icon={<Brain />}
            label='Thinking'
            active={reasoning !== 'medium'}
          >
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label className='text-xs text-muted-foreground'>
                  Reasoning effort
                </Label>
                <Select value={reasoning} onValueChange={setReasoning}>
                  <SelectTrigger size='sm'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='low'>Low</SelectItem>
                    <SelectItem value='medium'>Medium</SelectItem>
                    <SelectItem value='high'>High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className='text-xs text-muted-foreground'>
                Extended thinking controls are unavailable until the runtime
                contract exposes them.
              </p>
            </div>
          </CapabilityPopover>
          <CapabilityPopover
            icon={<SlidersHorizontal />}
            label='Context'
            active={false}
          >
            <div className='space-y-4'>
              <p className='text-xs text-muted-foreground'>
                Context switches are planned until source contracts expose
                per-turn tool and web controls.
              </p>

              <div className='space-y-2'>
                <PlannedToolRow icon={<Library />} label='memory.search' />
                <PlannedToolRow icon={<Wrench />} label='toolgate.run' />
                <PlannedToolRow icon={<Globe />} label='web.lookup' />
              </div>
            </div>
          </CapabilityPopover>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled
            aria-label='Attach file unavailable'
          >
            <Paperclip />
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled
            aria-label='Voice input planned'
          >
            Voice planned
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled
            aria-label='Camera planned'
          >
            Camera planned
          </Button>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            disabled
            aria-label='Live call planned'
          >
            Live call planned
          </Button>
          <div className='ml-auto flex items-center gap-1'>
            <CapabilityPopover
              icon={<EyeOff />}
              label='Incognito'
              active={memoryIncognito}
            >
              <div className='space-y-3'>
                <DisabledStatusRow
                  label='UI/session incognito'
                  status='planned'
                  detail='No verified session-retention contract is exposed yet.'
                />
                <SwitchRow
                  id='memory-incognito'
                  label='Memory incognito (per turn)'
                  checked={memoryIncognito}
                  onCheckedChange={setMemoryIncognito}
                />
              </div>
            </CapabilityPopover>
            <span className='hidden px-2 text-[10px] text-muted-foreground sm:inline'>
              Enter sends - Shift Enter adds line
            </span>
          </div>
          <Button
            type={isStreaming ? 'button' : 'submit'}
            size='icon'
            variant={isStreaming ? 'destructive' : 'default'}
            className='size-9 shrink-0'
            aria-label={isStreaming || sending ? 'Stop run' : 'Send message'}
            disabled={sending || isStreaming}
          >
            {isStreaming || sending ? <Square /> : <ArrowUp />}
          </Button>
        </div>
      </form>
    </div>
  )
}

function QuoteChip({
  label,
  text,
  onRemove,
}: {
  label: string
  text: string
  onRemove: () => void
}) {
  return (
    <div className='px-3 pt-3'>
      <div className='flex items-center gap-3 rounded-lg bg-background/35 px-3 py-2'>
        <span className='h-8 w-px shrink-0 rounded-full bg-primary/70' />
        <div className='min-w-0 flex-1'>
          <p className='text-[11px] text-muted-foreground'>{label}</p>
          <p className='truncate text-xs text-foreground/90'>{text}</p>
        </div>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-6 shrink-0 text-muted-foreground hover:text-foreground'
          aria-label='Remove quote'
          onClick={onRemove}
        >
          <X className='size-3.5' />
        </Button>
      </div>
    </div>
  )
}

function CapabilityPopover({
  icon,
  label,
  active,
  children,
  disabled = false,
}: {
  icon: React.ReactNode
  label: string
  active: boolean
  children?: React.ReactNode
  disabled?: boolean
}) {
  const trigger = (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      disabled={disabled}
      aria-label={label}
      className='relative'
    >
      {icon}
      {active ? (
        <span className='absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-primary' />
      ) : null}
    </Button>
  )

  if (disabled) {
    return <span>{trigger}</span>
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent side='top' align='start' className='w-72'>
        <div className='mb-3 flex items-center gap-2 text-sm font-medium'>
          {icon}
          {label}
        </div>
        {children}
      </PopoverContent>
    </Popover>
  )
}

function SwitchRow({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className='flex items-center justify-between gap-4'>
      <Label htmlFor={id} className='text-xs font-normal text-muted-foreground'>
        {label}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        className='scale-90'
      />
    </div>
  )
}

function DisabledStatusRow({
  label,
  status,
  detail,
}: {
  label: string
  status: string
  detail: string
}) {
  return (
    <div className='rounded-md border bg-muted/35 p-2 text-xs text-muted-foreground'>
      <div className='flex items-center justify-between gap-3'>
        <span>{label}</span>
        <Badge variant='outline'>{status}</Badge>
      </div>
      <p className='mt-1'>{detail}</p>
    </div>
  )
}

function PlannedToolRow({
  icon,
  label,
}: {
  icon: React.ReactNode
  label: string
  disabled?: boolean
}) {
  return (
    <div className='flex items-center justify-between gap-3 rounded-md px-1 py-1 text-muted-foreground'>
      <div className='flex min-w-0 items-center gap-2'>
        <span className='[&_svg]:size-3.5'>{icon}</span>
        <code className='truncate font-mono text-xs'>{label}</code>
      </div>
      <Badge variant='outline'>planned</Badge>
    </div>
  )
}

function MessageMeta({
  message,
  onFork,
}: {
  message: ChatMessage
  onFork: () => void
}) {
  const isOwner = message.role === 'owner'
  const toolCalls = message.trace?.length ?? 0
  const characterCount = message.content.length
  const speaker = message.agent_id ? ` - ${message.agent_id}` : ''
  const data = isOwner
    ? `${relativeTime(message.created_at)} - ${characterCount} chars`
    : `${relativeTime(message.created_at)}${speaker} - ${characterCount} chars - ${toolCalls} tools`

  return (
    <Collapsible className='min-w-0 flex-1' title={`message ${message.id}`}>
      <div className='flex min-w-0 items-center justify-between gap-3'>
        <span className='min-w-0 truncate px-1.5 font-mono text-[11px] text-muted-foreground'>
          {isOwner || !message.trace?.length ? (
            data
          ) : (
            <>
              {`${relativeTime(message.created_at)}${speaker} - ${characterCount} chars - `}
              <CollapsibleTrigger asChild>
                <button
                  type='button'
                  className='hover:text-foreground hover:underline'
                >
                  {toolCalls} tools
                </button>
              </CollapsibleTrigger>
            </>
          )}
        </span>
        <div className='flex shrink-0 items-center gap-0.5'>
          <MetaAction
            label='Copy message'
            onClick={() => navigator.clipboard?.writeText(message.content)}
          >
            <Clipboard />
          </MetaAction>
          {!isOwner ? (
            <UnavailableMetaAction
              availability={chatActionAvailability('regenerate', message)}
            >
              <RotateCcw />
            </UnavailableMetaAction>
          ) : null}
          <ForkAction onFork={onFork} />
          {!isOwner ? (
            <UnavailableMetaAction
              availability={{
                available: false,
                status: 'planned',
                reason:
                  'Sharing is unavailable until a backend contract exists.',
              }}
            >
              <Share2 />
            </UnavailableMetaAction>
          ) : null}
          {message.trace?.length ? (
            <TraceTrigger trace={message.trace} />
          ) : null}
        </div>
      </div>
      {message.trace?.length ? <TraceContent trace={message.trace} /> : null}
    </Collapsible>
  )
}

function ForkAction({ onFork }: { onFork: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <MetaAction label='Fork from here' onClick={onFork}>
            <GitFork />
          </MetaAction>
        </span>
      </TooltipTrigger>
      <TooltipContent>Fork</TooltipContent>
    </Tooltip>
  )
}

function UnavailableMetaAction({
  availability,
  children,
}: {
  availability: ReturnType<typeof chatActionAvailability>
  children: React.ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled
            className='size-6 shrink-0 text-muted-foreground'
            aria-label={availability.reason ?? 'Action unavailable'}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{availability.reason}</TooltipContent>
    </Tooltip>
  )
}

function MetaAction({
  label,
  children,
  onClick,
}: {
  label: string
  children: React.ReactNode
  onClick?: () => void
}) {
  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className='size-6 shrink-0 text-muted-foreground hover:text-foreground'
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function InlineSelect({
  value,
  items,
  label,
  disabled = false,
}: {
  value: string
  items: string[]
  label: string
  disabled?: boolean
}) {
  return (
    <Select defaultValue={value}>
      <SelectTrigger
        size='sm'
        aria-label={label}
        disabled={disabled}
        className='w-auto gap-1 border-0 bg-transparent px-2 shadow-none hover:bg-muted focus:ring-0 dark:bg-transparent dark:hover:bg-muted'
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TraceTrigger({ trace }: { trace: NonNullable<ChatMessage['trace']> }) {
  return (
    <CollapsibleTrigger asChild>
      <Button
        type='button'
        variant='ghost'
        size='icon'
        className='size-6 shrink-0 text-muted-foreground hover:text-foreground'
        aria-label={`Trace ${trace.length} tool calls`}
      >
        <FilePenLine className='size-3.5' />
      </Button>
    </CollapsibleTrigger>
  )
}

function TraceContent({ trace }: { trace: NonNullable<ChatMessage['trace']> }) {
  return (
    <CollapsibleContent className='mt-2 space-y-2 rounded-md bg-muted/35 p-3'>
      {trace.map((item, index) => (
        <div
          key={`${item.tool}-${index}`}
          className='grid gap-1 pb-2 text-xs sm:grid-cols-[140px_1fr_auto]'
        >
          <code className='font-mono'>{item.tool}</code>
          <div className='min-w-0'>
            <p className='text-muted-foreground'>
              {item.details_withheld
                ? 'Tool details withheld by the browser safety boundary.'
                : 'Tool details unavailable.'}
            </p>
          </div>
          <code className='font-mono text-[11px] text-muted-foreground'>
            {item.duration_ms} ms
          </code>
        </div>
      ))}
    </CollapsibleContent>
  )
}

function SessionActionsMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7'
          aria-label='Session actions'
        >
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem disabled>
          <Pencil />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Download />
          Export
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled variant='destructive'>
          <Trash2 />
          Delete session
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
