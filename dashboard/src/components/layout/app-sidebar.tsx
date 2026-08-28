import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bot, CircleDot, Command, Settings as SettingsIcon } from 'lucide-react'
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
import { getAgentGate } from '@/features/agentgate/api'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { deriveShellStatus } from './shell-status'

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
      <SidebarHeader className='min-h-24 flex-none justify-center overflow-hidden border-b px-3 py-2 group-data-[collapsible=icon]:min-h-20 group-data-[collapsible=icon]:px-2'>
        <SidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        {sidebarData.navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter className='border-t'>
        <SidebarUtilityBlock />
      </SidebarFooter>
    </Sidebar>
  )
}

function SidebarBrand() {
  return (
    <div className='grid min-w-0 gap-1.5'>
      <div className='flex min-w-0 items-center gap-2.5 group-data-[collapsible=icon]:justify-center'>
        <SystemInfoPanel />
        <div className='min-w-0 group-data-[collapsible=icon]:hidden'>
          <p className='truncate text-sm leading-5 font-semibold tracking-[-0.01em]'>
            AgentGate
          </p>
          <p className='truncate text-[11px] leading-4 text-sidebar-foreground/55'>
            Local agent console
          </p>
        </div>
      </div>
      <Button
        asChild
        variant='ghost'
        size='sm'
        className='h-8 w-full justify-start gap-2 px-2 text-sidebar-foreground/75 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0'
      >
        <Link to='/companion' aria-label='Open companion'>
          <Bot />
          <span className='group-data-[collapsible=icon]:hidden'>
            Companion
          </span>
        </Link>
      </Button>
    </div>
  )
}

function SidebarUtilityBlock() {
  const system = useQuery({
    queryKey: ['agentgate', 'system'],
    queryFn: () => getAgentGate<SystemInfo>('/api/system'),
  })
  const status = deriveShellStatus({
    isPending: system.isPending,
    isError: system.isError,
    hasData: Boolean(system.data),
  })
  const toneClass = {
    available: 'bg-success',
    pending: 'bg-warning',
    unavailable: 'bg-destructive',
    unknown: 'bg-muted-foreground/50',
  }[status.tone]

  return (
    <div className='grid min-w-0 gap-1.5'>
      <div className='flex items-center gap-1 px-1 group-data-[collapsible=icon]:flex-col group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center'>
        <Button
          asChild
          variant='ghost'
          size='icon'
          className='relative size-10'
        >
          <Link
            to='/activity'
            aria-label={`${status.label}. Open activity`}
            title={`Activity · ${status.label}`}
          >
            <CircleDot />
            <span
              aria-hidden='true'
              className={`absolute end-1 top-1 size-2 rounded-full ring-2 ring-sidebar ${toneClass}`}
            />
          </Link>
        </Button>
        <Button asChild variant='ghost' size='icon' className='size-10'>
          <Link to='/settings/gateways' aria-label='Settings'>
            <SettingsIcon />
            <span className='sr-only'>Settings</span>
          </Link>
        </Button>
        <SidebarTrigger aria-label='Toggle sidebar' className='size-10' />
      </div>
    </div>
  )
}

function SystemInfoPanel() {
  const system = useQuery({
    queryKey: ['agentgate', 'system'],
    queryFn: () => getAgentGate<SystemInfo>('/api/system'),
  })
  const data = system.data
  const containers = Array.isArray(data?.containers) ? data.containers : []
  const packages = Array.isArray(data?.packages) ? data.packages : []
  const rows: [string, string][] = [
    ['Host', unavailable()],
    ['OS / kernel', unavailable()],
    ['Uptime', containers[0]?.uptime ?? unavailable()],
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
          className='size-9 rounded-md text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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
              {containers.map((container) => (
                <CopyRow
                  key={container.name}
                  label={container.name}
                  value={`${container.status} · ${container.uptime} · cpu ${container.cpu} · ram ${container.memory}`}
                />
              ))}
            </InfoSection>
            <InfoSection title='Packages'>
              {packages.map((pkg) => (
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
