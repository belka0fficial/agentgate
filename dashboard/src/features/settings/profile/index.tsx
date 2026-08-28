import { type FormEvent, useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { changeAgentGateOwnerPassword } from '@/features/agentgate/api'

const sections = [
  {
    title: 'Setup',
    href: '/setup',
    status: 'active',
    keywords: 'setup registration onboarding identity companion missing data',
    description:
      'Review configured, missing, and deferred registration modules.',
  },
  {
    title: 'Gateways',
    href: '/settings/gateways',
    status: 'active',
    keywords:
      'providers pi adapter memorygate toolgate systemgate model routes gateway channel',
    description:
      'Inspect the private channel between AgentGate, Pi adapter, providers, MemoryGate, ToolGate, and SystemGate.',
  },
  {
    title: 'Agent Studio',
    href: '/character',
    status: 'active',
    keywords:
      'character companion agent model fallback tools skills avatar emotion pack',
    description:
      'Configure the main companion or agent metadata: mode, model, fallback, tools, skills, avatar, and emotion pack.',
  },
  {
    title: 'Agents',
    href: '/agents',
    status: 'active',
    keywords: 'agents workers teams inspect runtime pi',
    description: 'Inspect source-bound agent metadata from the Pi runtime.',
  },
  {
    title: 'Owner password',
    href: '/settings',
    status: 'active',
    keywords: 'password owner auth login unlock security safety',
    description:
      'Change the owner password stored by AgentGate. Existing server env keys remain server-side.',
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    status: 'planned',
    keywords: 'notifications alerts attention delivery',
    description:
      'Local attention and notification preferences when a real delivery contract exists.',
  },
]

function OwnerPasswordPanel() {
  const [currentKey, setCurrentKey] = useState('')
  const [newKey, setNewKey] = useState('')
  const [confirmKey, setConfirmKey] = useState('')
  const [message, setMessage] = useState('')
  const passwordsMatch = newKey === confirmKey
  const canSubmit =
    currentKey.trim().length > 0 && newKey.trim().length >= 12 && passwordsMatch
  const mutation = useMutation({
    mutationFn: () => changeAgentGateOwnerPassword(currentKey, newKey),
    onSuccess: () => {
      setCurrentKey('')
      setNewKey('')
      setConfirmKey('')
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
    if (canSubmit) mutation.mutate()
  }

  return (
    <section className='w-full border-t pt-6'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <div>
          <h2 className='text-base font-medium'>Owner password</h2>
          <p className='text-sm text-muted-foreground'>
            Normal settings inputs. The browser never receives or displays the
            stored verifier.
          </p>
        </div>
        <Badge>active</Badge>
      </div>
      <form
        className='grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto]'
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
        <div className='grid gap-2'>
          <Label htmlFor='confirm-owner-key'>Confirm new password</Label>
          <Input
            id='confirm-owner-key'
            type='password'
            value={confirmKey}
            onChange={(event) => setConfirmKey(event.target.value)}
            autoComplete='new-password'
            aria-invalid={!passwordsMatch}
          />
        </div>
        <Button
          className='self-end'
          type='submit'
          disabled={mutation.isPending || !canSubmit}
        >
          Update
        </Button>
      </form>
      {!passwordsMatch ? (
        <p className='mt-3 text-sm text-destructive'>Passwords do not match.</p>
      ) : message ? (
        <p className='mt-3 text-sm text-muted-foreground'>{message}</p>
      ) : null}
    </section>
  )
}

export function SettingsProfile() {
  const [query, setQuery] = useState('')
  const filteredSections = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return sections
    return sections.filter((section) =>
      `${section.title} ${section.description} ${section.keywords}`
        .toLowerCase()
        .includes(needle)
    )
  }, [query])

  return (
    <div className='w-full space-y-8'>
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <h1 className='text-xl font-semibold tracking-tight'>Settings</h1>
          <span className='font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase'>
            searchable control plane
          </span>
        </div>
        <p className='text-sm leading-6 text-muted-foreground'>
          Settings are plain inputs and searchable rows, not decorative cards.
          Search covers settings sections, navigation targets, chat/session
          concepts, agents, model routes, passwords, tools, skills, and gate
          configuration labels.
        </p>
      </div>

      <div className='w-full space-y-2'>
        <Label htmlFor='settings-search'>Search settings and navigation</Label>
        <div className='relative'>
          <Search className='absolute top-2.5 left-3 size-4 text-muted-foreground' />
          <Input
            id='settings-search'
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search passwords, agents, model, tools, skills, chats...'
            className='pl-9'
          />
        </div>
      </div>

      <OwnerPasswordPanel />

      <section className='w-full border-t pt-6'>
        <h2 className='mb-3 text-base font-medium'>Settings index</h2>
        <div className='divide-y rounded-md border'>
          {filteredSections.map((section) => (
            <Link
              key={section.title}
              to={section.href}
              className='flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-muted/35'
            >
              <div className='min-w-0 space-y-1'>
                <div className='flex items-center gap-2'>
                  <span className='font-medium'>{section.title}</span>
                  <Badge
                    variant={
                      section.status === 'active' ? 'default' : 'outline'
                    }
                  >
                    {section.status}
                  </Badge>
                </div>
                <p className='text-sm text-muted-foreground'>
                  {section.description}
                </p>
              </div>
              <ArrowRight className='size-4 text-muted-foreground' />
            </Link>
          ))}
          {filteredSections.length === 0 ? (
            <p className='p-4 text-sm text-muted-foreground'>
              No settings match that search.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  )
}
