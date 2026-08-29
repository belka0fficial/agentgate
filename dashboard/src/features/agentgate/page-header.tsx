import type { ReactNode } from 'react'
import { useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
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
  '/automations': { title: 'Automations', context: 'Deterministic workflows' },
  '/tasks': { title: 'Tasks', context: 'Workspace operations' },
  '/users': { title: 'Users', context: 'Workspace operators' },
  '/capabilities': { title: 'Capabilities', context: 'Tools and skills' },
  '/memory': { title: 'Memory', context: 'Evidence and context' },
  '/apps': { title: 'Apps', context: 'Projects' },
  '/system': { title: 'System', context: 'Runtime' },
  '/character': { title: 'Agent Studio', context: 'Agent configuration' },
  '/setup': { title: 'Setup', context: 'Registration status' },
  '/setup/identity': { title: 'Setup', context: 'Owner identity' },
  '/setup/companion': { title: 'Setup', context: 'Companion choice' },
  '/settings/gateways': { title: 'Gateways', context: 'Local routing' },
  '/settings/account': { title: 'Owner access', context: 'Settings' },
  '/settings/notifications': { title: 'Notifications', context: 'Settings' },
  '/settings/appearance': { title: 'Appearance', context: 'Theme' },
  '/settings/display': { title: 'Display', context: 'Unavailable' },
  '/settings/character': { title: 'Agent Studio', context: 'Settings' },
  '/settings': { title: 'Settings', context: 'Local configuration' },
  '/suggestions': { title: 'Suggestions', context: 'Review queue' },
}

export function AgentGateHeader({
  eyebrow,
  leftExtra,
  title,
}: {
  eyebrow?: string
  leftExtra?: ReactNode
  title?: string
}) {
  const location = useLocation()
  const meta = getRouteMeta(location.pathname)
  const currentTitle = title ?? meta.title
  const currentContext = eyebrow ?? meta.context

  return (
    <header
      aria-label={`${currentTitle}: ${currentContext} application controls`}
      className='sticky top-0 z-30 border-b bg-background/95 px-4 supports-[backdrop-filter]:backdrop-blur-sm'
    >
      <div className='flex min-h-14 min-w-0 items-center gap-2 py-2 md:py-0'>
        <SidebarTrigger
          aria-label='Toggle navigation'
          className='size-9 shrink-0'
        />
        <Breadcrumb context={currentContext} title={currentTitle} />
        {leftExtra}
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

function Breadcrumb({ context, title }: { context: string; title: string }) {
  return (
    <nav
      aria-label='Breadcrumb'
      className='flex min-w-0 items-center gap-2 text-sm'
    >
      <span className='truncate text-muted-foreground'>{context}</span>
      <ChevronRight className='size-3.5 shrink-0 text-muted-foreground/60' />
      <span className='truncate font-medium text-foreground'>{title}</span>
    </nav>
  )
}
