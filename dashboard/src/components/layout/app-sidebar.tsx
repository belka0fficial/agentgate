import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Command, Settings as SettingsIcon } from 'lucide-react'
import { useLayout } from '@/context/layout-provider'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { ThemeSwitch } from '@/components/theme-switch'
import { getAgentGate } from '@/features/agentgate/api'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'

type SystemInfo = {
  vitals?: {
    cpu_percent?: number
    memory?: { percent?: number }
    disk?: { percent?: number }
    cpu_count?: number
  }
  backups?: { latest?: { name?: string } }
  containers?: {
    name: string
    status: string
    uptime: string
    cpu: string
    memory: string
  }[]
  packages?: { name: string; current: string; latest: string; state: string }[]
}

export function AppSidebar() {
  const { collapsible, variant } = useLayout()

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader className='h-24 flex-none justify-center overflow-hidden border-b px-3 py-3 group-data-[collapsible=icon]:h-20 group-data-[collapsible=icon]:px-2'>
        <AgentStatusBlock />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <div className='flex items-center gap-1 px-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center'>
          <ThemeSwitch className='size-10 scale-100 rounded-md' />
          <Button asChild variant='ghost' size='icon' className='size-10'>
            <Link to='/settings/gateways' aria-label='Settings'>
              <SettingsIcon />
              <span className='sr-only'>Settings</span>
            </Link>
          </Button>
          <SidebarTrigger aria-label='Toggle sidebar' className='size-10' />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function AgentStatusBlock() {
  return (
    <div className='grid min-w-0 justify-items-start gap-3 group-data-[collapsible=icon]:justify-items-center'>
      <div className='flex min-w-0 items-center gap-3 group-data-[collapsible=icon]:justify-center'>
        <SystemInfoPanel />
        <div className='min-w-0 group-data-[collapsible=icon]:hidden'>
          <p className='truncate text-sm leading-5 font-semibold'>AgentGate</p>
          <p className='truncate text-[11px] leading-4 text-sidebar-foreground/60'>
            local agent console
          </p>
        </div>
      </div>
      <Link
        to='/system'
        className='flex min-w-0 items-center gap-2 rounded-md px-1 py-0.5 text-sidebar-foreground/65 transition-colors group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        aria-label='Open system status'
      >
        <span className='size-2 shrink-0 rounded-full bg-muted-foreground/45' />
        <span className='min-w-0 truncate font-mono text-[11px] leading-4 group-data-[collapsible=icon]:hidden'>
          status unknown
        </span>
      </Link>
    </div>
  )
}

function SystemInfoPanel() {
  const system = useQuery({
    queryKey: ['agentgate', 'system'],
    queryFn: () => getAgentGate<SystemInfo>('/api/system'),
  })
  const data = system.data
  const rows: [string, string][] = [
    ['Host', unavailable()],
    ['OS / kernel', unavailable()],
    ['Uptime', data?.containers?.[0]?.uptime ?? unavailable()],
    [
      'CPU',
      `${data?.vitals?.cpu_percent ?? '—'}% · ${
        data?.vitals?.cpu_count ?? '—'
      } cores`,
    ],
    ['RAM', `${data?.vitals?.memory?.percent ?? '—'}%`],
    ['Disk', `${data?.vitals?.disk?.percent ?? '—'}%`],
    ['Backup verified', data?.backups?.latest?.name ?? unavailable()],
    ['Adapter', unavailable()],
    ['Pi version', unavailable()],
    ['Stack commit', unavailable()],
    ['Tailscale', unavailable()],
  ]

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          type='button'
          variant='ghost'
          size='icon'
          className='size-9 rounded-md text-sidebar-foreground/80 group-data-[collapsible=icon]:size-7 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
          aria-label='Open system info'
        >
          <Command className='size-4' />
        </Button>
      </DialogTrigger>
      <DialogContent className='max-h-[min(760px,calc(100dvh-2rem))] w-[min(86vw,1150px)] max-w-none grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-border/70 bg-popover/95 p-0 shadow-2xl ring-1 ring-white/5 sm:max-w-none'>
        <DialogHeader className='border-b px-6 pt-6 pb-4'>
          <DialogTitle>System info</DialogTitle>
          <DialogDescription>
            Live values from SystemGate. Click a value to copy it.
          </DialogDescription>
        </DialogHeader>
        <div className='min-h-0 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          <div className='grid gap-5 lg:grid-cols-2'>
            <InfoSection title='Host'>{rows.map(renderCopyRow)}</InfoSection>
            <InfoSection title='Containers'>
              {(data?.containers ?? []).map((container) => (
                <CopyRow
                  key={container.name}
                  label={container.name}
                  value={`${container.status} · ${container.uptime} · cpu ${container.cpu} · ram ${container.memory}`}
                />
              ))}
            </InfoSection>
            <InfoSection title='Packages'>
              {(data?.packages ?? []).map((pkg) => (
                <CopyRow
                  key={pkg.name}
                  label={pkg.name}
                  value={`${pkg.current} → ${pkg.latest} · ${pkg.state}`}
                />
              ))}
            </InfoSection>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function renderCopyRow([label, value]: [string, string]) {
  return <CopyRow key={label} label={label} value={value} />
}

function InfoSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section>
      <h2 className='mb-2 text-xs font-medium text-muted-foreground'>
        {title}
      </h2>
      <div className='divide-y rounded-md border'>{children}</div>
    </section>
  )
}

function CopyRow({ label, value }: { label: string; value: string }) {
  return (
    <button
      type='button'
      className='grid w-full min-w-0 grid-cols-[112px_minmax(0,1fr)] gap-3 px-3 py-2 text-left text-xs hover:bg-muted/50'
      onClick={() => navigator.clipboard?.writeText(value)}
    >
      <span className='text-muted-foreground'>{label}</span>
      <code className='min-w-0 font-mono break-words text-foreground/90'>
        {value}
      </code>
    </button>
  )
}

function unavailable() {
  return 'unavailable'
}
