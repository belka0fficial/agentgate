import { useCallback, useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
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
  deleteAgentGate,
  getAgentGate,
  patchAgentGate,
  postAgentGate,
  relativeTime,
  type ChatMessage,
  type ChatMutationResult,
  type ChatSession,
} from './api'
import {
  chatActionAvailability,
  chatModelChoices,
  forkPayloadForMessage,
  safeChatUiError,
  safeMarkdownBlocks,
  streamChatBody,
  type MarkdownInlinePart,
} from './chat-controls-model'

type AgentChoice = {
  id: string
  name?: string
  label?: string
  status?: string
}

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
  const [promptDraft, setPromptDraft] = useState('')
  const [selectionChip, setSelectionChip] = useState<{
    text: string
    x: number
    y: number
    chatState: ChatState
  } | null>(null)
  const [selectionNotice, setSelectionNotice] = useState('')
  const [forkError, setForkError] = useState('')
  const [mutationError, setMutationError] = useState('')
  const [mutationNotice, setMutationNotice] = useState('')
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
  const sessionDetail = useQuery({
    queryKey: ['agentgate', 'chats', chatId, 'detail'],
    queryFn: () =>
      getAgentGate<{ session: ChatSession | null; status: string }>(
        `/api/chats/${encodeURIComponent(chatId)}`
      ),
  })
  const conversation = useQuery({
    queryKey: ['agentgate', 'chats', chatId, 'messages'],
    queryFn: () =>
      getAgentGate<{ messages: ChatMessage[] }>(
        `/api/chats/${encodeURIComponent(chatId)}/messages`
      ),
  })
  const renameSession = useMutation({
    mutationFn: (title: string) =>
      patchAgentGate<ChatMutationResult>(
        `/api/chats/${encodeURIComponent(chatId)}`,
        { title }
      ),
    onSuccess: async () => {
      setMutationError('')
      setMutationNotice('Session renamed from brain source.')
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agentgate', 'chats'] }),
        queryClient.invalidateQueries({
          queryKey: ['agentgate', 'chats', chatId, 'detail'],
        }),
      ])
    },
    onError: (error) => setMutationError(safeChatUiError(error)),
  })
  const deleteSession = useMutation({
    mutationFn: () =>
      deleteAgentGate<ChatMutationResult>(
        `/api/chats/${encodeURIComponent(chatId)}`,
        { confirm_source: 'brain', confirm_session_id: chatId }
      ),
    onSuccess: async () => {
      setMutationError('')
      await queryClient.invalidateQueries({ queryKey: ['agentgate', 'chats'] })
      void navigate({ to: '/chats' })
    },
    onError: (error) => setMutationError(safeChatUiError(error)),
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
        `/api/chats/${encodeURIComponent(chatId)}/fork`,
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
                    {sessionDetail.data?.session?.title ??
                      'AgentGate conversation'}
                  </h1>
                  <p className='truncate font-mono text-xs text-muted-foreground'>
                    {chatId} - private Pi session - {messages.length} turns
                  </p>
                </div>
                <div className='flex shrink-0 items-center gap-1'>
                  <SessionActionsMenu
                    chatId={chatId}
                    title={sessionDetail.data?.session?.title}
                    isMutating={
                      renameSession.isPending || deleteSession.isPending
                    }
                    onRefresh={() => {
                      void queryClient.invalidateQueries({
                        queryKey: ['agentgate', 'chats', chatId],
                      })
                    }}
                    onRename={(title) => renameSession.mutate(title)}
                    onDelete={() => deleteSession.mutate()}
                  />
                </div>
              </div>
            </div>
            {forkError || mutationError || mutationNotice ? (
              <div
                className={`mx-auto mb-2 w-full max-w-[1200px] px-4 text-xs sm:px-6 ${mutationNotice && !forkError && !mutationError ? 'text-muted-foreground' : 'text-destructive'}`}
              >
                {forkError || mutationError || mutationNotice}
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
                    <EmptySession onPrompt={setPromptDraft} />
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
                key={promptDraft || 'composer'}
                chatId={chatId}
                initialPrompt={promptDraft}
                onPromptConsumed={() => setPromptDraft('')}
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
          <MarkdownMessage content={message.content} />
        </div>
        <div className='mt-1.5 flex min-w-0 items-center gap-1 overflow-hidden whitespace-nowrap opacity-45 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100'>
          <MessageMeta message={message} onFork={() => onFork(message)} />
        </div>
      </div>
    </article>
  )
}

function MarkdownMessage({ content }: { content: string }) {
  const blocks = safeMarkdownBlocks(content)
  if (!blocks.length) return null

  return (
    <div className='space-y-3 whitespace-normal'>
      {blocks.map((block, index) => {
        if (block.kind === 'codeBlock') {
          return (
            <pre
              key={`code-${index}`}
              className='overflow-x-auto rounded-md bg-background/60 p-3 font-mono text-xs whitespace-pre'
            >
              {block.language ? (
                <code className='mb-2 block text-[10px] text-muted-foreground'>
                  {block.language}
                </code>
              ) : null}
              <code>{block.text}</code>
            </pre>
          )
        }
        return (
          <p key={`paragraph-${index}`} className='whitespace-pre-wrap'>
            {block.parts.map((part, partIndex) => (
              <MarkdownPart key={`${part.kind}-${partIndex}`} part={part} />
            ))}
          </p>
        )
      })}
    </div>
  )
}

function MarkdownPart({ part }: { part: MarkdownInlinePart }) {
  if (part.kind === 'link') {
    return (
      <a
        href={part.href}
        target='_blank'
        rel='noreferrer noopener'
        className='text-primary underline underline-offset-2'
      >
        {part.text}
      </a>
    )
  }
  if (part.kind === 'code') {
    return (
      <code className='rounded bg-background/60 px-1 py-0.5 font-mono text-[0.92em]'>
        {part.text}
      </code>
    )
  }
  return <>{part.text}</>
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
        disabled={!chatActionAvailability('selected-reply').available}
        aria-label='Selected-text reply unavailable'
        onClick={() => onQuote(selection.text)}
      >
        Reply unavailable
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
        disabled={!chatActionAvailability('selected-memory').available}
        aria-label='Selected-text memory unavailable'
        onClick={() => onMemory(selection.text)}
      >
        Memory unavailable
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
    model?: string
    provider?: string
  }
) {
  const response = await fetch(
    `/api/chats/${encodeURIComponent(sessionId)}/stream`,
    {
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
    }
  )

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
  initialPrompt,
  onPromptConsumed,
  isStreaming = false,
  onSend,
}: {
  chatId: string
  initialPrompt?: string
  onPromptConsumed?: () => void
  isStreaming?: boolean
  onSend?: () => void
}) {
  const [value, setValue] = useState(
    () => initialPrompt || getForkPrefill(chatId)
  )
  const [memoryIncognito, setMemoryIncognito] = useState(false)
  const [reasoning, setReasoning] = useState('medium')
  const [selectedModel, setSelectedModel] = useState('source-default')
  const [selectedAgent, setSelectedAgent] = useState('source-default')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const modelMetadata = useQuery({
    queryKey: ['agentgate', 'models', 'chat-composer'],
    queryFn: () => getAgentGate<unknown>('/api/models'),
  })
  const agentMetadata = useQuery({
    queryKey: ['agentgate', 'agents', 'chat-composer'],
    queryFn: () => getAgentGate<{ agents: AgentChoice[] }>('/api/agents'),
  })
  const modelChoices = chatModelChoices(modelMetadata.data).filter(
    (choice) => choice.status === 'live'
  )
  const selectedModelChoice = modelChoices.find(
    (choice) => choice.value === selectedModel
  )
  const agentChoices = agentMetadata.data?.agents ?? []
  const agentItems = [
    'source-default',
    ...agentChoices.map((agent) => agent.id),
  ]

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
            ...(selectedAgent !== 'source-default'
              ? { agentId: selectedAgent }
              : {}),
            ...(selectedModelChoice
              ? {
                  model: selectedModelChoice.value,
                  provider: selectedModelChoice.provider,
                }
              : {}),
          })
            .then(() => onSend?.())
            .catch((error: unknown) => {
              setSendError(safeChatUiError(error))
              setValue(input)
            })
            .finally(() => setSending(false))
          onPromptConsumed?.()
        }}
      >
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
            disabled={!modelChoices.length}
            value={selectedModelChoice?.value ?? 'source-default'}
            items={
              modelChoices.length
                ? modelChoices.map((choice) => choice.value)
                : ['source-default']
            }
            label={
              modelChoices.length
                ? 'Model from /api/models'
                : 'Model unavailable until source metadata loads'
            }
            onValueChange={setSelectedModel}
          />
          <InlineSelect
            disabled={!agentItems.length}
            value={selectedAgent}
            items={agentItems}
            label='Agent from /api/agents'
            onValueChange={setSelectedAgent}
            formatItem={(item) =>
              item === 'source-default'
                ? 'Source default agent'
                : agentChoices.find((agent) => agent.id === item)?.name ||
                  agentChoices.find((agent) => agent.id === item)?.label ||
                  item
            }
          />
          <Button
            asChild
            variant='ghost'
            size='sm'
            className='h-8 px-2 text-xs'
          >
            <Link to='/agents'>Agents</Link>
          </Button>
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
                Reasoning effort is sent to the verified ChatInput intensity
                contract.
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
          <UnavailableMetaAction
            availability={chatActionAvailability('file-attachment')}
            buttonClassName='size-9 shrink-0 text-muted-foreground'
          >
            <Paperclip />
          </UnavailableMetaAction>
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
                  detail='UI incognito is a local composer state. Memory incognito below is sent only when the runtime accepts the turn payload.'
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
            aria-label={
              isStreaming
                ? 'Stop run unavailable'
                : sending
                  ? 'Sending message'
                  : 'Send message'
            }
            disabled={sending || isStreaming}
          >
            {isStreaming || sending ? <Square /> : <ArrowUp />}
          </Button>
        </div>
      </form>
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
              availability={chatActionAvailability('share', message)}
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
  buttonClassName = 'size-6 shrink-0 text-muted-foreground',
}: {
  availability: ReturnType<typeof chatActionAvailability>
  children: React.ReactNode
  buttonClassName?: string
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
            className={buttonClassName}
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
  onValueChange,
  formatItem,
}: {
  value: string
  items: string[]
  label: string
  disabled?: boolean
  onValueChange?: (value: string) => void
  formatItem?: (value: string) => string
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
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
            {formatItem ? formatItem(item) : item}
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

function SessionActionsMenu({
  chatId,
  title,
  isMutating,
  onRefresh,
  onRename,
  onDelete,
}: {
  chatId: string
  title?: string
  isMutating: boolean
  onRefresh: () => void
  onRename: (title: string) => void
  onDelete: () => void
}) {
  function requestRename() {
    const nextTitle = window.prompt(
      'Rename this brain session. Raw prompts/tool output are never exported.',
      title ?? ''
    )
    const safeTitle = nextTitle?.trim()
    if (safeTitle) onRename(safeTitle)
  }

  function requestDelete() {
    const typed = window.prompt(
      `Delete brain session ${chatId}. Type the exact session id to confirm.`
    )
    if (typed === chatId) onDelete()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-7'
          aria-label='Session actions'
          disabled={isMutating}
        >
          <MoreHorizontal className='size-4' />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem onClick={onRefresh}>
          <RotateCcw />
          Refresh source history
        </DropdownMenuItem>
        <DropdownMenuItem onClick={requestRename}>
          <Pencil />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Download />
          Export unavailable - no safe contract
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant='destructive' onClick={requestDelete}>
          <Trash2 />
          Delete session
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
