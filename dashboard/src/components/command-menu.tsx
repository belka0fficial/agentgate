import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import {
  ArrowRight,
  Bot,
  Brain,
  Laptop,
  MessageSquarePlus,
  Moon,
  Play,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  Wrench,
} from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { useTheme } from '@/context/theme-provider'
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
  type Approval,
  type ChatSession,
} from '@/features/agentgate/api'
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
  const { setTheme } = useTheme()
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
    queryFn: () => getAgentGate<Approval[]>('/api/approvals'),
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
  const approvalRows = approvals.data ?? []

  return (
    <CommandDialog
      modal
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
      showCloseButton={false}
      className='top-20 w-[min(86vw,1150px)] max-w-none translate-y-0 overflow-hidden rounded-xl border border-border/70 bg-popover/95 p-0 shadow-2xl ring-1 ring-white/5 sm:max-w-none'
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder='Search commands, sessions, memories, personas...'
        wrapperClassName='m-3 h-11 rounded-full border-0 bg-muted/70 px-4'
        className='h-11'
      />
      <CommandList className='max-h-[560px] px-2 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        <CommandEmpty>No results found.</CommandEmpty>

        {show('>') ? (
          <CommandGroup heading='Actions'>
            <PaletteItem
              icon={<MessageSquarePlus />}
              value='> new chat start conversation'
              title='New chat'
              detail='Start a fresh session'
              shortcut='>'
              onSelect={() => runCommand(() => navigate({ to: '/chats' }))}
            />
            <PaletteItem
              icon={<Plus />}
              value='> new automation schedule'
              title='New automation'
              detail='Create a scheduled job draft'
              shortcut='>'
              onSelect={() =>
                runCommand(() => navigate({ to: '/automations' }))
              }
            />
            <PaletteItem
              icon={<Bot />}
              value='> new persona character studio'
              title='New persona'
              detail='Open the persona roster'
              shortcut='>'
              onSelect={() => runCommand(() => navigate({ to: '/character' }))}
            />
            <PaletteItem
              icon={<Play />}
              value='> run audit system approvals memory'
              title='Run audit'
              detail='Open System for the current health/audit view'
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
                value={`@ persona ${persona.name} ${persona.role} ${persona.identity} ${persona.voice}`}
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
              <PaletteItem
                icon={<Sun />}
                value='settings theme light'
                title='Theme: light'
                detail='Switch appearance'
                onSelect={() => runCommand(() => setTheme('light'))}
              />
              <PaletteItem
                icon={<Moon />}
                value='settings theme dark'
                title='Theme: dark'
                detail='Switch appearance'
                onSelect={() => runCommand(() => setTheme('dark'))}
              />
              <PaletteItem
                icon={<Laptop />}
                value='settings theme system'
                title='Theme: system'
                detail='Follow OS preference'
                onSelect={() => runCommand(() => setTheme('system'))}
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
