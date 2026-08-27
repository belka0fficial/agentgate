import { type FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Bell, Router, ShieldCheck, UserCog } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeAgentGateOwnerPassword } from '@/features/agentgate/api'

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
      'Change the owner password stored by AgentGate. Existing server env keys remain server-side.',
    icon: ShieldCheck,
    status: 'active',
  },
]

function OwnerPasswordPanel() {
  const [currentKey, setCurrentKey] = useState('')
  const [newKey, setNewKey] = useState('')
  const [message, setMessage] = useState('')
  const mutation = useMutation({
    mutationFn: () => changeAgentGateOwnerPassword(currentKey, newKey),
    onSuccess: () => {
      setCurrentKey('')
      setNewKey('')
      setMessage(
        'Owner password updated. Use it next time you unlock AgentGate.'
      )
    },
    onError: (error) => {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not update owner password'
      )
    },
  })

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (currentKey.trim() && newKey.trim()) mutation.mutate()
  }

  return (
    <Card className='max-w-3xl'>
      <CardHeader>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <CardTitle className='text-base'>Owner password</CardTitle>
            <p className='mt-2 text-sm leading-6 text-muted-foreground'>
              Manage the dashboard unlock password. The browser never receives
              or displays the stored verifier.
            </p>
          </div>
          <Badge variant='default'>active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form
          className='grid gap-4 sm:grid-cols-[1fr_1fr_auto]'
          onSubmit={submit}
        >
          <div className='grid gap-2'>
            <Label htmlFor='current-owner-key'>Current password</Label>
            <Input
              id='current-owner-key'
              type='password'
              value={currentKey}
              onChange={(event) => setCurrentKey(event.target.value)}
              autoComplete='current-password'
            />
          </div>
          <div className='grid gap-2'>
            <Label htmlFor='new-owner-key'>New password</Label>
            <Input
              id='new-owner-key'
              type='password'
              value={newKey}
              onChange={(event) => setNewKey(event.target.value)}
              autoComplete='new-password'
              minLength={12}
            />
          </div>
          <Button
            className='self-end'
            type='submit'
            disabled={
              mutation.isPending ||
              !currentKey.trim() ||
              newKey.trim().length < 12
            }
          >
            Update
          </Button>
        </form>
        {message ? (
          <p className='mt-3 text-sm text-muted-foreground'>{message}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

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

      <OwnerPasswordPanel />

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
