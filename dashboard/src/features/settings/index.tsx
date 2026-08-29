import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from '@/features/agentgate/page-header'

export function Settings() {
  const location = useLocation()
  const childOwnsHeader = location.pathname === '/settings/character'

  if (childOwnsHeader) return <Outlet />

  return (
    <>
      <AgentGateHeader />
      <Main fluid className='px-4 py-6 sm:px-6'>
        <div className='mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[190px_minmax(0,1fr)]'>
          <SettingsNav pathname={location.pathname} />
          <div className='min-w-0'>
            <Outlet />
          </div>
        </div>
      </Main>
    </>
  )
}

function SettingsNav({ pathname }: { pathname: string }) {
  const items = [
    { title: 'Overview', href: '/settings' },
    { title: 'Account', href: '/settings/account' },
    { title: 'Appearance', href: '/settings/appearance' },
    { title: 'Gateways', href: '/settings/gateways' },
    { title: 'Notifications', href: '/settings/notifications' },
    { title: 'Display', href: '/settings/display' },
  ]
  return (
    <nav aria-label='Settings sections' className='space-y-1'>
      <p className='px-2 pb-2 text-xs font-medium text-muted-foreground'>
        Settings
      </p>
      {items.map((item) => (
        <Link
          key={item.href}
          to={item.href}
          className={cn(
            'block rounded-md px-2 py-2 text-sm transition-colors',
            pathname === item.href
              ? 'bg-muted font-medium text-foreground'
              : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
          )}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}
