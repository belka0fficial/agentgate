import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Bot,
  Brain,
  MessageSquarePlus,
  Play,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command'
import {
  getAgentGate,
  relativeTime,
  type ChatSession,
} from '@/features/agentgate/api'
import {
  normalizeVerificationsResponse,
  type VerificationCenter,
} from '@/features/agentgate/approvals-model'
import { personas } from '@/features/agentgate/personas'
import { sidebarData } from './layout/data/sidebar-data'

type MemoryRecord = {
  id: string
  title: string
  kind: string
  confidence: string
  updated_at: string
}

type Automation = {
  id: string
  name: string
  description: string
  status: string
  next: string
}

const knownScopes = new Set(['>', '@', '#'])

export function CommandMenu() {
  const navigate = useNavigate()
  const { open, setOpen } = useSearch()
  const [query, setQuery] = React.useState('')
  const sessions = useQuery({
    queryKey: ['agentgate', 'chats'],
    queryFn: () => getAgentGate<{ sessions: ChatSession[] }>('/api/chats'),
  })
  const memories = useQuery({
    queryKey: ['agentgate', 'memory'],
    queryFn: () =>
      getAgentGate<{ memories: MemoryRecord[] }>('/api/gates/memorygate'),
  })
  const automations = useQuery({
    queryKey: ['agentgate', 'automations'],
    queryFn: () =>
      getAgentGate<{
        jobs?: Automation[]
        toolgate_automations?: Automation[]
        automations?: Automation[]
      }>('/api/automations'),
  })
  const approvals = useQuery({
    queryKey: ['agentgate', 'approvals'],
    queryFn: async () =>
      normalizeVerificationsResponse(
        await getAgentGate<VerificationCenter>('/api/approvals')
      ),
  })

  const scope = query.trim().charAt(0)
  const empty = query.trim().length === 0

  const runCommand = React.useCallback(
    (command: () => unknown) => {
      setOpen(false)
      setQuery('')
      command()
    },
    [setOpen]
  )

  const show = React.useCallback(
    (...prefixes: string[]) =>
      empty || !knownScopes.has(scope) || prefixes.includes(scope),
    [empty, scope]
  )

  const navItems = sidebarData.navGroups.flatMap((group) => group.items)
  const sessionRows = sessions.data?.sessions ?? []
  const memoryRows = memories.data?.memories ?? []
  const automationRows = [
    ...(automations.data?.automations ?? []),
    ...(automations.data?.jobs ?? []),
    ...(automations.data?.toolgate_automations ?? []),
  ]
  const approvalRows = approvals.data?.pending ?? []

  return (
    <CommandDialog
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
      showCloseButton={false}
      className='top-20 w-[min(92vw,720px)] max-w-none translate-y-0 overflow-hidden rounded-lg border bg-popover p-0 shadow-xl sm:max-w-none'
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder='Search commands, sessions, memories, personas...'
        wrapperClassName='m-2 h-10 rounded-md border bg-surface-2 px-3'
        className='h-10'
      />
      <CommandList className='max-h-[min(520px,70dvh)] border-t px-1 py-2'>
        <CommandEmpty>No results found.</CommandEmpty>

        {show('>') ? (
          <CommandGroup heading='Actions'>
            <PaletteItem
              icon={<MessageSquarePlus />}
              value='> open chats sessions conversation'
              title='Open chats'
              detail='Browse sessions or start from the Chats screen'
              shortcut='>'
              onSelect={() => runCommand(() => navigate({ to: '/chats' }))}
            />
            <PaletteItem
              icon={<Plus />}
              value='> open automations schedules'
              title='Open automations'
              detail='Review source-bound schedules and automations'
              shortcut='>'
              onSelect={() =>
                runCommand(() => navigate({ to: '/automations' }))
              }
            />
            <PaletteItem
              icon={<Bot />}
              value='> open agent studio persona character'
              title='Open Agent Studio'
              detail='Configure the main companion or inspect optional metadata'
              shortcut='>'
              onSelect={() => runCommand(() => navigate({ to: '/character' }))}
            />
            <PaletteItem
              icon={<Play />}
              value='> open system status runtime'
              title='Open system status'
              detail='Inspect the latest source-bound runtime data'
              shortcut='>'
              onSelect={() => runCommand(() => navigate({ to: '/system' }))}
            />
          </CommandGroup>
        ) : null}

        {show() ? (
          <CommandGroup heading='Sessions'>
            {sessionRows.map((session) => (
              <PaletteItem
                key={session.id}
                icon={<MessageSquarePlus />}
                value={`session ${session.title} ${session.preview}`}
                title={session.title}
                detail={session.preview}
                shortcut={relativeTime(session.updated_at)}
                onSelect={() =>
                  runCommand(() =>
                    navigate({ to: '/chats/$id', params: { id: session.id } })
                  )
                }
              />
            ))}
          </CommandGroup>
        ) : null}

        {show('#') ? (
          <CommandGroup heading='Memories'>
            {memoryRows.map((memory) => (
              <PaletteItem
                key={memory.id}
                icon={<Brain />}
                value={`# memory ${memory.title} ${memory.kind} ${memory.confidence}`}
                title={memory.title}
                detail={`${memory.kind} · ${memory.confidence}`}
                shortcut='#'
                onSelect={() => runCommand(() => navigate({ to: '/memory' }))}
              />
            ))}
          </CommandGroup>
        ) : null}

        {show('@') ? (
          <CommandGroup heading='Personas'>
            {personas.map((persona) => (
              <PaletteItem
                key={persona.id}
                icon={<Bot />}
                value={`@ persona ${persona.name} ${persona.role} ${persona.identity}`}
                title={persona.name}
                detail={`${persona.role} · ${persona.identity}`}
                shortcut='@'
                onSelect={() =>
                  runCommand(() => navigate({ to: '/character' }))
                }
              />
            ))}
          </CommandGroup>
        ) : null}

        {show() ? (
          <CommandGroup heading='Automations'>
            {automationRows.map((automation) => (
              <PaletteItem
                key={automation.id}
                icon={<Wrench />}
                value={`automation ${automation.name} ${automation.status}`}
                title={automation.name}
                detail='Metadata only; prompts and arguments stay server-side.'
                shortcut={automation.status}
                onSelect={() =>
                  runCommand(() => navigate({ to: '/automations' }))
                }
              />
            ))}
          </CommandGroup>
        ) : null}

        {show() ? (
          <CommandGroup heading='Approvals'>
            {approvalRows.map((approval) => (
              <PaletteItem
                key={approval.id}
                icon={<ShieldCheck />}
                value={`approval ${approval.title} ${approval.source} ${approval.details}`}
                title={approval.title}
                detail={approval.details}
                shortcut={approval.source}
                onSelect={() =>
                  runCommand(() => navigate({ to: '/approvals' }))
                }
              />
            ))}
          </CommandGroup>
        ) : null}

        {show() ? (
          <CommandGroup heading='Navigation'>
            {navItems.map((item) =>
              item.url ? (
                <PaletteItem
                  key={item.url}
                  icon={<ArrowRight />}
                  value={`navigation ${item.title} ${item.url}`}
                  title={item.title}
                  detail={item.url}
                  onSelect={() => runCommand(() => navigate({ to: item.url }))}
                />
              ) : null
            )}
          </CommandGroup>
        ) : null}

        {show() ? (
          <CommandGroup heading='Models'>
            {['gpt-5.2', 'gpt-5.2-mini', 'o4-mini'].map((model) => (
              <PaletteItem
                key={model}
                icon={<Sparkles />}
                value={`model switch ${model}`}
                title={`Switch model to ${model}`}
                detail='Current chat composer preference'
                shortcut='model'
                onSelect={() =>
                  runCommand(() => {
                    localStorage.setItem('agentgate:composer-model', model)
                    window.dispatchEvent(new Event('agentgate:model-change'))
                  })
                }
              />
            ))}
          </CommandGroup>
        ) : null}

        {show() ? (
          <>
            <CommandSeparator />
            <CommandGroup heading='Settings'>
              <PaletteItem
                icon={<Settings />}
                value='settings character persona defaults'
                title='Character settings'
                detail='Personas, defaults, response length'
                onSelect={() =>
                  runCommand(() => navigate({ to: '/character' }))
                }
              />
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}

function PaletteItem({
  icon,
  value,
  title,
  detail,
  shortcut,
  onSelect,
}: {
  icon: React.ReactNode
  value: string
  title: string
  detail?: string
  shortcut?: string
  onSelect: () => void
}) {
  return (
    <CommandItem value={value} onSelect={onSelect} className='items-start py-2'>
      <span className='mt-0.5 flex size-5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:size-4'>
        {icon}
      </span>
      <span className='min-w-0 flex-1'>
        <span className='block truncate text-sm'>{title}</span>
        {detail ? (
          <span className='block truncate text-xs text-muted-foreground'>
            {detail}
          </span>
        ) : null}
      </span>
      {shortcut ? <CommandShortcut>{shortcut}</CommandShortcut> : null}
    </CommandItem>
  )
}
