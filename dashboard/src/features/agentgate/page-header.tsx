import type { ReactNode } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import {
  Copy,
  LayoutDashboard,
  MessageSquarePlus,
  MoreHorizontal,
  Search,
  ShieldCheck,
} from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'

const routeMeta: Record<string, { title: string; context: string }> = {
  '/': { title: 'Command', context: 'Overview' },
  '/activity': { title: 'Activity', context: 'Agent and system activity' },
  '/companion': { title: 'Companion', context: 'Main agent' },
  '/chats': { title: 'Chats', context: 'Sessions' },
  '/approvals': { title: 'Approvals', context: 'Owner gate' },
  '/orchestration': { title: 'Orchestration', context: 'Flows and runs' },
  '/agents': { title: 'Agents', context: 'Roster' },
  '/jobs': { title: 'Jobs', context: 'Schedules and runs' },
  '/capabilities': { title: 'Capabilities', context: 'Tools and skills' },
  '/memory': { title: 'Memory', context: 'Evidence and context' },
  '/apps': { title: 'Apps', context: 'Projects' },
  '/system': { title: 'System', context: 'Runtime' },
  '/character': { title: 'Agent Studio', context: 'Agent configuration' },
  '/settings/gateways': { title: 'Gateways', context: 'Local routing' },
  '/settings/account': { title: 'Owner access', context: 'Settings' },
  '/settings/notifications': { title: 'Notifications', context: 'Settings' },
  '/settings/appearance': { title: 'Appearance', context: 'Unavailable' },
  '/settings/display': { title: 'Display', context: 'Unavailable' },
  '/settings/character': { title: 'Agent Studio', context: 'Settings' },
  '/settings': { title: 'Settings', context: 'Local configuration' },
  '/suggestions': { title: 'Suggestions', context: 'Review queue' },
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
  const meta = getRouteMeta(location.pathname)
  const currentTitle = title ?? meta.title
  const currentContext = eyebrow ?? meta.context

  return (
    <header
      aria-label={`${currentTitle}: ${currentContext} application controls`}
      className='sticky top-0 z-30 bg-background/95 px-4 supports-[backdrop-filter]:backdrop-blur-sm'
    >
      <div className='w-full'>
        <div className='flex min-h-14 min-w-0 flex-wrap items-center gap-2 py-2 md:flex-nowrap md:py-0'>
          <SidebarTrigger
            aria-label='Open navigation'
            className='size-9 shrink-0 md:hidden'
          />
          <Button
            asChild
            variant='ghost'
            size='icon'
            className='size-9 shrink-0'
          >
            <Link to='/' aria-label='Open Command' title='Command'>
              <LayoutDashboard />
            </Link>
          </Button>

          {leftExtra}
          <ToolbarSearch onOpen={() => setOpen(true)} />

          {actions ? (
            <div className='order-last flex w-full min-w-0 items-center gap-2 border-t pt-2 md:order-none md:w-auto md:shrink-0 md:border-0 md:pt-0'>
              {actions}
            </div>
          ) : null}

          <QuickActions />
          {hideMoreActions ? null : (
            <UtilityMenu onSearch={() => setOpen(true)} />
          )}
        </div>
      </div>
    </header>
  )
}

function getRouteMeta(path: string) {
  const match = Object.entries(routeMeta)
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))

  return match?.[1] ?? { title: 'AgentGate', context: 'Control plane' }
}

function ToolbarSearch({ onOpen }: { onOpen: () => void }) {
  return (
    <Button
      type='button'
      variant='outline'
      className='group h-9 min-w-28 flex-1 justify-start gap-2 overflow-hidden bg-surface-1 px-3 text-sm font-normal text-muted-foreground shadow-none'
      aria-label='Search AgentGate'
      aria-keyshortcuts='Meta+K Control+K'
      onClick={onOpen}
    >
      <Search className='size-3.5 shrink-0' />
      <span className='truncate'>Search AgentGate</span>
      <kbd className='ml-auto hidden h-5 items-center rounded border bg-surface-2 px-1.5 font-mono text-[10px] text-muted-foreground md:inline-flex'>
        Ctrl K
      </kbd>
    </Button>
  )
}

function QuickActions() {
  return (
    <div className='hidden shrink-0 items-center gap-1 sm:flex'>
      <Button asChild variant='ghost' size='icon' className='size-8'>
        <Link to='/chats' aria-label='Open chats' title='Chats'>
          <MessageSquarePlus />
        </Link>
      </Button>
      <Button asChild variant='ghost' size='icon' className='size-8'>
        <Link to='/approvals' aria-label='Open approvals' title='Approvals'>
          <ShieldCheck />
        </Link>
      </Button>
    </div>
  )
}

function UtilityMenu({ onSearch }: { onSearch: () => void }) {
  const copyLink = () => navigator.clipboard?.writeText(window.location.href)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-8 shrink-0 text-muted-foreground'
          aria-label='Page actions'
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-48'>
        <DropdownMenuItem className='gap-2' onClick={onSearch}>
          <Search />
          Search AgentGate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className='gap-2 sm:hidden'>
          <Link to='/chats'>
            <MessageSquarePlus />
            Chats
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className='gap-2 sm:hidden'>
          <Link to='/approvals'>
            <ShieldCheck />
            Approvals
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className='sm:hidden' />
        <DropdownMenuItem className='gap-2' onClick={copyLink}>
          <Copy />
          Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
