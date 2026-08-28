import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { Copy, MoreHorizontal, Search } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'

const routeMeta: Record<string, { title: string; context: string }> = {
  '/': { title: 'Command', context: 'Overview' },
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
    <header className='sticky top-0 z-30 border-b bg-background/95 px-4 supports-[backdrop-filter]:backdrop-blur-sm'>
      <div className='@7xl/content:mx-auto @7xl/content:w-full @7xl/content:max-w-7xl'>
        <div className='flex min-h-14 min-w-0 items-center gap-2 sm:gap-3'>
          <SidebarTrigger
            aria-label='Open navigation'
            className='size-9 shrink-0 md:hidden'
          />
          <div className='flex min-w-0 shrink items-center gap-2'>
            <div className='min-w-0'>
              <div className='flex min-w-0 items-center gap-1.5 text-sm'>
                <span className='hidden text-muted-foreground sm:inline'>
                  AgentGate
                </span>
                <span className='hidden text-muted-foreground/45 sm:inline'>
                  /
                </span>
                <h1 className='truncate font-semibold tracking-[-0.015em]'>
                  {currentTitle}
                </h1>
              </div>
              <p className='hidden truncate text-[11px] leading-4 text-muted-foreground lg:block'>
                {currentContext}
              </p>
            </div>
            {leftExtra}
          </div>

          <div className='ml-auto flex min-w-0 items-center gap-1.5'>
            <ToolbarSearch onOpen={() => setOpen(true)} />
            {actions ? (
              <div className='flex max-w-[42vw] min-w-0 shrink items-center overflow-hidden sm:max-w-none'>
                {actions}
              </div>
            ) : null}
            {hideMoreActions ? null : (
              <UtilityMenu onSearch={() => setOpen(true)} />
            )}
          </div>
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
      className='group h-8 w-9 justify-start gap-2 overflow-hidden px-2.5 text-sm font-normal text-muted-foreground shadow-none sm:w-44 md:w-56'
      aria-keyshortcuts='Meta+K Control+K'
      onClick={onOpen}
    >
      <Search className='size-3.5 shrink-0' />
      <span className='hidden truncate sm:inline'>Search</span>
      <kbd className='ml-auto hidden h-5 items-center rounded border bg-surface-2 px-1.5 font-mono text-[10px] text-muted-foreground md:inline-flex'>
        Ctrl K
      </kbd>
    </Button>
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
          className='size-8 text-muted-foreground'
          aria-label='Page actions'
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-44'>
        <DropdownMenuItem className='gap-2' onClick={onSearch}>
          <Search />
          Search
        </DropdownMenuItem>
        <DropdownMenuItem className='gap-2' onClick={copyLink}>
          <Copy />
          Copy link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
