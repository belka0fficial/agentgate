import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock,
  Download,
  FileDown,
  History,
  MemoryStick,
  MessageSquarePlus,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ToolbarAction =
  | {
      label: string
      icon: ReactNode
      to: string
      primary?: boolean
      onClick?: never
    }
  | {
      label: string
      icon: ReactNode
      to?: never
      primary?: boolean
      onClick: () => void
    }

const titles: Record<string, { title: string; eyebrow: string }> = {
  '/': { title: 'Command', eyebrow: 'Source-bound console' },
  '/companion': { title: 'Companion', eyebrow: 'Main agent profile' },
  '/chats': { title: 'Chats', eyebrow: 'Sessions' },
  '/approvals': { title: 'Approvals', eyebrow: 'Owner gate' },
  '/orchestration': { title: 'Orchestration', eyebrow: 'Flows and runs' },
  '/agents': { title: 'Agents', eyebrow: 'Inspect and route' },
  '/jobs': { title: 'Jobs', eyebrow: 'Scheduled agent work' },
  '/capabilities': { title: 'Capabilities', eyebrow: 'Tools and skills' },
  '/memory': { title: 'Memory', eyebrow: 'Context store' },
  '/apps': { title: 'Apps', eyebrow: 'Hosted outputs' },
  '/system': { title: 'System', eyebrow: 'Runtime' },
  '/settings/character': { title: 'Character', eyebrow: 'Metadata only' },
}

export function AgentGateHeader({
  actions,
  eyebrow,
  hideMoreActions = false,
  leftExtra,
  title,
}: {
  actions?: ReactNode
  eyebrow?: string
  hideMoreActions?: boolean
  leftExtra?: ReactNode
  title?: string
}) {
  const location = useLocation()
  const { setOpen } = useSearch()
  const path = location.pathname
  const routeMeta = getMeta(path)
  const meta = {
    title: title ?? routeMeta.title,
    eyebrow: eyebrow ?? routeMeta.eyebrow,
  }
  const toolbar = getActions(path, () => setOpen(true))

  return (
    <div className='px-4 pt-4'>
      <div className='@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'>
        <div className='flex min-h-8 min-w-0 items-center gap-3'>
          <div className='flex shrink-0 items-baseline gap-2'>
            <h1 className='truncate text-lg leading-8 font-semibold tracking-tight'>
              {meta.title}
            </h1>
            <p className='hidden font-mono text-[11px] leading-8 tracking-wide text-muted-foreground uppercase sm:block'>
              {meta.eyebrow}
            </p>
            {leftExtra}
          </div>
          <div className='flex min-w-0 flex-1 items-center gap-1.5'>
            <ToolbarSearch onOpen={() => setOpen(true)} />
            <div className='flex shrink-0 items-center gap-1.5'>
              {toolbar.primary.map((action) => (
                <ToolbarActionButton key={action.label} action={action} />
              ))}
              {actions}
              {hideMoreActions ? null : <MoreActions actions={toolbar.more} />}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getMeta(path: string) {
  const match = Object.entries(titles)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))

  return match?.[1] ?? titles['/']
}

function getActions(
  path: string,
  openSearch: () => void
): { primary: ToolbarAction[]; more: ToolbarAction[] } {
  const refresh = () => window.location.reload()
  const copyLink = () => navigator.clipboard?.writeText(window.location.href)
  const exportPage = () => window.print()

  const commonMore: ToolbarAction[] = [
    { label: 'Search', icon: <Search />, onClick: openSearch },
    { label: 'Copy link', icon: <FileDown />, onClick: copyLink },
    { label: 'Export view', icon: <Download />, onClick: exportPage },
  ]

  if (path.startsWith('/chats')) {
    return {
      primary: [
        {
          label: 'New chat',
          icon: <MessageSquarePlus />,
          onClick: () => window.dispatchEvent(new Event('agentgate:new-chat')),
          primary: true,
        },
        { label: 'Memory', icon: <MemoryStick />, to: '/memory' },
        { label: 'Settings', icon: <Bot />, to: '/settings/character' },
      ],
      more: [
        { label: 'Approvals', icon: <ShieldCheck />, to: '/approvals' },
        { label: 'Refresh sessions', icon: <RefreshCcw />, onClick: refresh },
        ...commonMore,
      ],
    }
  }

  if (path.startsWith('/approvals')) {
    return {
      primary: [
        {
          label: 'History',
          icon: <History />,
          onClick: () => jumpTo('history'),
        },
        { label: 'Ask agent', icon: <Send />, to: '/chats' },
      ],
      more: [
        { label: 'Refresh queue', icon: <RefreshCcw />, onClick: refresh },
        { label: 'Memory context', icon: <MemoryStick />, to: '/memory' },
        ...commonMore,
      ],
    }
  }

  if (path.startsWith('/system')) {
    return {
      primary: [
        {
          label: 'Refresh status',
          icon: <Activity />,
          onClick: refresh,
          primary: true,
        },
        { label: 'Jobs', icon: <History />, to: '/jobs' },
        {
          label: 'Backups',
          icon: <CheckCircle2 />,
          onClick: () => jumpTo('backups'),
        },
      ],
      more: [
        { label: 'Open chat', icon: <MessageSquarePlus />, to: '/chats' },
        ...commonMore,
      ],
    }
  }

  if (path.startsWith('/jobs')) {
    return {
      primary: [
        {
          label: 'New job',
          icon: <Plus />,
          onClick: openSearch,
          primary: true,
        },
        { label: 'Run now', icon: <Activity />, onClick: refresh },
        {
          label: 'History',
          icon: <History />,
          onClick: () => jumpTo('history'),
        },
      ],
      more: [
        { label: 'Capabilities', icon: <Sparkles />, to: '/capabilities' },
        { label: 'System health', icon: <Activity />, to: '/system' },
        ...commonMore,
      ],
    }
  }

  if (path.startsWith('/memory')) {
    return {
      primary: [
        {
          label: 'Newest',
          icon: <Clock />,
          onClick: () => jumpTo('memory-list'),
        },
        { label: 'Ask agent', icon: <Send />, to: '/chats' },
      ],
      more: [
        { label: 'Companion', icon: <Sparkles />, to: '/companion' },
        ...commonMore,
      ],
    }
  }

  if (path.startsWith('/companion')) {
    return {
      primary: [
        { label: 'Ask in chat', icon: <Send />, to: '/chats', primary: true },
        { label: 'Approvals', icon: <ShieldCheck />, to: '/approvals' },
        { label: 'Memory', icon: <MemoryStick />, to: '/memory' },
      ],
      more: [
        {
          label: 'Refresh journal',
          icon: <RefreshCcw />,
          onClick: refresh,
        },
        ...commonMore,
      ],
    }
  }

  if (path.startsWith('/character') || path.startsWith('/settings/character')) {
    return {
      primary: [],
      more: commonMore,
    }
  }

  return {
    primary: [
      {
        label: 'New chat',
        icon: <MessageSquarePlus />,
        to: '/chats',
        primary: true,
      },
      { label: 'Approvals', icon: <ShieldCheck />, to: '/approvals' },
      { label: 'Refresh', icon: <RefreshCcw />, onClick: refresh },
    ],
    more: [
      { label: 'Memory', icon: <MemoryStick />, to: '/memory' },
      { label: 'Companion', icon: <Sparkles />, to: '/companion' },
      ...commonMore,
    ],
  }
}

function ToolbarSearch({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      type='button'
      variant='outline'
      className='group h-8 min-w-0 flex-1 justify-start gap-2 rounded-md bg-muted/25 px-3 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent'
      onClick={onOpen}
    >
      <Search className='size-4' />
      <span className='hidden sm:inline'>Search</span>
      <kbd className='ml-auto hidden h-5 items-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground group-hover:bg-accent sm:inline-flex'>
        Ctrl K
      </kbd>
    </Button>
  )
}

function ToolbarActionButton({ action }: { action: ToolbarAction }) {
  const className = action.primary
    ? 'size-8 rounded-md bg-muted/70 text-foreground hover:bg-accent hover:text-accent-foreground [&_svg]:size-4'
    : 'size-8 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:size-4'

  if (action.to) {
    return (
      <Button asChild variant='ghost' size='icon' className={className}>
        <Link to={action.to} aria-label={action.label} title={action.label}>
          {action.icon}
          <span className='sr-only'>{action.label}</span>
        </Link>
      </Button>
    )
  }

  const onClick = action.onClick
  if (!onClick) return null

  return (
    <Button
      type='button'
      variant='ghost'
      size='icon'
      className={className}
      onClick={onClick}
      aria-label={action.label}
      title={action.label}
    >
      {action.icon}
      <span className='sr-only'>{action.label}</span>
    </Button>
  )
}

function MoreActions({ actions }: { actions: ToolbarAction[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-8 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:size-4'
          aria-label='More actions'
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-52'>
        <DropdownMenuLabel>More actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {actions.map((action) =>
          action.to ? (
            <DropdownMenuItem key={action.label} asChild>
              <Link to={action.to} className='gap-2'>
                {action.icon}
                {action.label}
              </Link>
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              key={action.label}
              className='gap-2'
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          )
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function jumpTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}
