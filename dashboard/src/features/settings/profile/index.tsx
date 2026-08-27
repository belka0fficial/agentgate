import { Link } from '@tanstack/react-router'
import { ArrowRight, Bell, Router, ShieldCheck, UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const sections = [
  {
    title: 'Gateways',
    href: '/settings/gateways',
    description:
      'Inspect the private channel between AgentGate, Pi adapter, providers, MemoryGate, ToolGate, and SystemGate.',
    icon: Router,
    status: 'active',
  },
  {
    title: 'Character',
    href: '/settings/character',
    description:
      'Configure the main companion text identity and local Conker avatar emotion package.',
    icon: UserCog,
    status: 'active',
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    description:
      'Local attention and notification preferences when a real delivery contract exists.',
    icon: Bell,
    status: 'planned',
  },
  {
    title: 'Safety',
    href: '/settings/account',
    description:
      'Owner access, approval boundaries, and data withheld from the browser.',
    icon: ShieldCheck,
    status: 'planned',
  },
]

export function SettingsProfile() {
  return (
    <div className='w-full space-y-6'>
      <div className='max-w-3xl space-y-2'>
        <div className='flex items-center gap-2'>
          <h1 className='text-xl font-semibold tracking-tight'>Settings</h1>
          <span className='font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase'>
            control plane
          </span>
        </div>
        <p className='text-sm leading-6 text-muted-foreground'>
          Real owner settings only. No fake theme/layout playground, no profile
          avatar cruft, no search bar pretending to configure things.
        </p>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.href} to={section.href} className='group block'>
              <Card className='h-full transition-colors group-hover:border-primary/40 group-hover:bg-muted/30'>
                <CardHeader className='space-y-3'>
                  <div className='flex items-start justify-between gap-3'>
                    <span className='rounded-lg border bg-background p-2 text-muted-foreground group-hover:text-foreground'>
                      <Icon className='size-5' />
                    </span>
                    <Badge
                      variant={
                        section.status === 'active' ? 'default' : 'outline'
                      }
                    >
                      {section.status}
                    </Badge>
                  </div>
                  <CardTitle className='flex items-center gap-2 text-base'>
                    {section.title}
                    <ArrowRight className='size-4 opacity-0 transition-opacity group-hover:opacity-100' />
                  </CardTitle>
                </CardHeader>
                <CardContent className='pt-0 text-sm leading-6 text-muted-foreground'>
                  {section.description}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
