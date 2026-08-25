import { Outlet } from '@tanstack/react-router'
import {
  Bell,
  Monitor,
  Palette,
  Router,
  Settings2,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { SidebarNav } from './components/sidebar-nav'

const sidebarNavItems = [
  {
    title: 'General',
    href: '/settings',
    icon: <Settings2 size={18} />,
  },
  {
    title: 'Gateways',
    href: '/settings/gateways',
    icon: <Router size={18} />,
  },
  {
    title: 'Safety',
    href: '/settings/account',
    icon: <ShieldCheck size={18} />,
  },
  {
    title: 'Profile',
    href: '/settings/character',
    icon: <UserCog size={18} />,
  },
  {
    title: 'Appearance',
    href: '/settings/appearance',
    icon: <Palette size={18} />,
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    icon: <Bell size={18} />,
  },
  {
    title: 'Display',
    href: '/settings/display',
    icon: <Monitor size={18} />,
  },
]

export function Settings() {
  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main fixed fluid className='px-0 py-0'>
        <div className='grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]'>
          <aside className='min-h-0 border-r bg-muted/10'>
            <div className='border-b px-5 py-5'>
              <div className='flex items-center justify-between gap-3'>
                <div>
                  <h1 className='text-xl font-semibold tracking-tight'>Settings</h1>
                  <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                    Configure AgentGate as a local owner control plane.
                  </p>
                </div>
                <Badge variant='outline' className='hidden shrink-0 xl:inline-flex'>
                  local
                </Badge>
              </div>
            </div>
            <div className='p-3'>
              <SidebarNav items={sidebarNavItems} />
            </div>
          </aside>

          <section className='min-h-0 overflow-y-auto'>
            <div className='mx-auto w-full max-w-6xl px-5 py-6 lg:px-8'>
              <div className='mb-6'>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='secondary'>owner gated</Badge>
                  <Badge variant='outline'>source-bound metadata</Badge>
                  <Badge variant='outline'>no browser secrets</Badge>
                </div>
                <Separator className='mt-5' />
              </div>
              <Outlet />
            </div>
          </section>
        </div>
      </Main>
    </>
  )
}
