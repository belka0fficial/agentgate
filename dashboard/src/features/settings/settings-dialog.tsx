import { useState, type ReactNode } from 'react'
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
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { GatewaySettings } from './gateways'
import { SettingsProfile } from './profile'

type SettingsSection = 'general' | 'gateways' | 'safety' | 'profile' | 'appearance' | 'notifications' | 'display'

const sections: {
  id: SettingsSection
  title: string
  description: string
  icon: typeof Settings2
  status?: string
}[] = [
  {
    id: 'general',
    title: 'General',
    description: 'Overview and settings map.',
    icon: Settings2,
  },
  {
    id: 'gateways',
    title: 'Gateways',
    description: 'Pi adapter, providers, and gate health.',
    icon: Router,
    status: 'active',
  },
  {
    id: 'safety',
    title: 'Safety',
    description: 'Owner access and approval boundaries.',
    icon: ShieldCheck,
    status: 'planned',
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'Character and operator-facing identity.',
    icon: UserCog,
    status: 'existing',
  },
  {
    id: 'appearance',
    title: 'Appearance',
    description: 'Theme and visual preferences.',
    icon: Palette,
    status: 'existing',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Local alerts and owner attention.',
    icon: Bell,
    status: 'existing',
  },
  {
    id: 'display',
    title: 'Display',
    description: 'Density and presentation.',
    icon: Monitor,
    status: 'existing',
  },
]

export function SettingsDialog({ trigger }: { trigger: ReactNode }) {
  const [active, setActive] = useState<SettingsSection>('general')

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className='grid max-h-[min(820px,calc(100dvh-2rem))] w-[min(92vw,1180px)] max-w-none grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-border/70 bg-popover/95 p-0 shadow-2xl ring-1 ring-white/5 sm:max-w-none'>
        <DialogHeader className='border-b px-6 pt-6 pb-4 text-left'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div>
              <DialogTitle>Settings</DialogTitle>
              <DialogDescription className='mt-1'>
                Configure AgentGate without leaving the current workspace.
              </DialogDescription>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Badge variant='secondary'>owner gated</Badge>
              <Badge variant='outline'>source-bound metadata</Badge>
              <Badge variant='outline'>no browser secrets</Badge>
            </div>
          </div>
        </DialogHeader>

        <div className='grid min-h-0 grid-cols-[240px_minmax(0,1fr)]'>
          <aside className='min-h-0 border-r bg-muted/10 p-3'>
            <nav className='grid gap-1'>
              {sections.map((section) => {
                const Icon = section.icon
                const selected = active === section.id
                return (
                  <button
                    key={section.id}
                    type='button'
                    onClick={() => setActive(section.id)}
                    className={cn(
                      'flex min-w-0 items-start gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                      selected
                        ? 'bg-muted text-foreground shadow-sm'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <Icon className='mt-0.5 size-4 shrink-0' />
                    <span className='min-w-0 flex-1'>
                      <span className='flex items-center justify-between gap-2 font-medium'>
                        {section.title}
                        {section.status ? (
                          <span className='rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground'>
                            {section.status}
                          </span>
                        ) : null}
                      </span>
                      <span className='mt-0.5 line-clamp-2 block text-xs leading-4 opacity-80'>
                        {section.description}
                      </span>
                    </span>
                  </button>
                )
              })}
            </nav>
          </aside>

          <main className='min-h-0 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            <SettingsDialogPanel active={active} setActive={setActive} />
          </main>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function SettingsDialogPanel({
  active,
  setActive,
}: {
  active: SettingsSection
  setActive: (section: SettingsSection) => void
}) {
  if (active === 'general') return <SettingsProfile />
  if (active === 'gateways') return <GatewaySettings />

  const section = sections.find((item) => item.id === active)
  const Icon = section?.icon ?? Settings2
  return (
    <div className='grid min-h-[360px] place-items-center rounded-xl border border-dashed bg-muted/20 p-8 text-center'>
      <div className='max-w-md'>
        <div className='mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border bg-background'>
          <Icon className='size-5 text-muted-foreground' />
        </div>
        <h3 className='text-lg font-semibold'>{section?.title ?? 'Settings'} is planned</h3>
        <p className='mt-2 text-sm leading-6 text-muted-foreground'>
          This section stays visible so the settings system has a clear map, but
          it will not show fake controls before AgentGate has a source-bound
          backend contract for it.
        </p>
        <Button className='mt-5' variant='outline' onClick={() => setActive('gateways')}>
          Open Gateway settings
        </Button>
      </div>
    </div>
  )
}
