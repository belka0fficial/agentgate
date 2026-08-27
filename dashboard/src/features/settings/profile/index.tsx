import { Link } from '@tanstack/react-router'
import { ArrowRight, Bell, Router, ShieldCheck, UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ContentSection } from '../components/content-section'

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
    title: 'Safety',
    href: '/settings/account',
    description:
      'Owner access, approval boundaries, and which data is intentionally kept out of the browser.',
    icon: ShieldCheck,
    status: 'planned',
  },
  {
    title: 'Profile',
    href: '/settings/character',
    description:
      'Character and operator-facing identity controls. Kept separate from infrastructure settings.',
    icon: UserCog,
    status: 'existing',
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    description:
      'Notification preferences for local alerts and owner attention.',
    icon: Bell,
    status: 'existing',
  },
]

export function SettingsProfile() {
  return (
    <ContentSection
      title='General'
      desc='Choose the settings area to configure. Gateway settings are the active AgentGate control-plane slice right now.'
    >
      <div>
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Link
                key={section.href}
                to={section.href}
                className='group block'
              >
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
                        className='capitalize'
                      >
                        {section.status}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className='flex items-center gap-2 text-base'>
                        {section.title}
                        <ArrowRight className='size-4 opacity-0 transition-opacity group-hover:opacity-100' />
                      </CardTitle>
                      <CardDescription className='mt-2 leading-6'>
                        {section.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>

        <Card className='mt-6 border-dashed bg-muted/20'>
          <CardContent className='py-5 text-sm leading-6 text-muted-foreground'>
            Settings are split from the main app navigation on purpose: the app
            sidebar gets you to work areas; this settings rail configures how
            AgentGate connects, protects, and presents those areas.
          </CardContent>
        </Card>
      </div>
    </ContentSection>
  )
}
