import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { Bot, Check, KeyRound, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getAgentGate, postAgentGate, putAgentGate } from './api'

export type SetupStep = {
  id: 'password' | 'identity' | 'companion'
  status: 'configured' | 'missing' | 'deferred' | 'blocked' | 'unavailable'
  required: boolean
}

export type SetupStatus = {
  status: 'configured' | 'incomplete'
  next_required_step: string | null
  steps: SetupStep[]
}

type OwnerProfile = {
  display_name: string
  username: string
  configured: boolean
}

function useSetupStatus() {
  return useQuery({
    queryKey: ['agentgate', 'setup'],
    queryFn: () => getAgentGate<SetupStatus>('/api/setup/status'),
    retry: false,
  })
}

const stepMeta = {
  password: { label: 'Password', icon: KeyRound },
  identity: { label: 'Identity', icon: UserRound },
  companion: { label: 'Companion', icon: Bot },
}

function SetupFrame({ children }: { children: ReactNode }) {
  const setup = useSetupStatus()
  const location = useLocation()
  if (setup.isError) {
    return (
      <main className='grid min-h-svh place-items-center bg-background px-6 text-foreground'>
        <div className='w-full max-w-lg rounded-lg border border-destructive/40 p-5'>
          <h1 className='text-base font-medium'>Could not load setup status</h1>
          <p className='mt-2 text-sm text-muted-foreground'>
            No module state is being inferred.
          </p>
          <Button
            className='mt-4'
            variant='outline'
            onClick={() => setup.refetch()}
          >
            Retry
          </Button>
        </div>
      </main>
    )
  }
  return (
    <main className='min-h-svh bg-background text-foreground lg:grid lg:grid-cols-[280px_minmax(0,1fr)]'>
      <aside className='border-b px-6 py-6 lg:min-h-svh lg:border-r lg:border-b-0 lg:px-8 lg:py-10'>
        <p className='text-sm font-semibold'>AgentGate</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          Registration progress
        </p>
        <div className='mt-7'>
          <p className='text-xs leading-5 text-muted-foreground'>
            Configure only the modules you want. Required dependencies block
            only what needs them.
          </p>
          <ol className='mt-5 space-y-1'>
            {(setup.data?.steps ?? []).map((step, index) => {
              const meta = stepMeta[step.id]
              const Icon = meta.icon
              const href =
                step.id === 'identity'
                  ? '/setup/identity'
                  : step.id === 'companion'
                    ? '/setup/companion'
                    : '/setup'
              return (
                <li key={step.id}>
                  <Link
                    to={href}
                    aria-current={
                      location.pathname === href ? 'step' : undefined
                    }
                    className='flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted'
                  >
                    <span className='flex size-7 items-center justify-center rounded-full border text-xs'>
                      {step.status === 'configured' ? (
                        <Check className='size-3.5' />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <Icon className='size-4 text-muted-foreground' />
                    <span className='min-w-0 flex-1'>{meta.label}</span>
                    <span className='text-[11px] text-muted-foreground'>
                      {step.status}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ol>
          <p className='mt-5 text-xs leading-5 text-muted-foreground'>
            Deferred is not configured. You can reopen that module later.
          </p>
        </div>
      </aside>
      <section className='min-w-0 px-6 py-8 sm:px-10 lg:px-14 lg:py-12'>
        {children}
      </section>
    </main>
  )
}

function ScreenHeading({
  title,
  description,
  optional = false,
}: {
  title: string
  description: string
  optional?: boolean
}) {
  return (
    <div className='mb-6 border-b pb-5'>
      <div className='flex flex-wrap items-center gap-2'>
        <h1 className='text-xl font-semibold tracking-[-0.02em]'>{title}</h1>
        <Badge variant='outline'>
          {optional ? 'Optional module' : 'Required for dashboard access'}
        </Badge>
      </div>
      <p className='mt-2 max-w-3xl text-sm leading-6 text-muted-foreground'>
        {description}
      </p>
    </div>
  )
}

export function SetupOverviewPage() {
  const setup = useSetupStatus()
  return (
    <SetupFrame>
      <ScreenHeading
        title='Registration status'
        description='AgentGate composes independent setup screens. Missing data opens only the screen that owns it.'
      />
      <div className='divide-y rounded-lg border'>
        {(setup.data?.steps ?? []).map((step) => (
          <div
            key={step.id}
            className='flex flex-wrap items-center justify-between gap-3 px-4 py-3'
          >
            <div>
              <p className='text-sm font-medium'>{stepMeta[step.id].label}</p>
              <p className='text-xs text-muted-foreground'>
                {step.required ? 'required dependency' : 'optional capability'}
              </p>
            </div>
            <Badge variant='outline'>{step.status}</Badge>
          </div>
        ))}
      </div>
    </SetupFrame>
  )
}

export function SetupIdentityPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const profile = useQuery({
    queryKey: ['agentgate', 'owner-profile'],
    queryFn: () => getAgentGate<OwnerProfile>('/api/owner/profile'),
  })
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  useEffect(() => {
    if (!profile.data) return
    queueMicrotask(() => {
      setDisplayName(profile.data.display_name)
      setUsername(profile.data.username)
    })
  }, [profile.data])
  const save = useMutation({
    mutationFn: () =>
      putAgentGate('/api/owner/profile', {
        display_name: displayName.trim(),
        username: username.trim().toLowerCase(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agentgate', 'setup'] })
      await queryClient.invalidateQueries({
        queryKey: ['agentgate', 'owner-profile'],
      })
      void navigate({ to: '/setup/companion' })
    },
  })
  if (profile.isError) {
    return (
      <SetupFrame>
        <ScreenHeading
          title='Owner identity'
          description='Local labels used inside AgentGate.'
        />
        <div className='rounded-lg border border-destructive/40 p-4'>
          <p className='text-sm text-destructive'>
            Could not load owner identity
          </p>
          <Button
            className='mt-3'
            variant='outline'
            onClick={() => profile.refetch()}
          >
            Retry
          </Button>
        </div>
      </SetupFrame>
    )
  }
  return (
    <SetupFrame>
      <ScreenHeading
        title='Owner identity'
        description='Local labels used inside AgentGate. This does not create an operating-system account, cloud account, or public profile.'
      />
      <form
        className='max-w-2xl space-y-5'
        onSubmit={(event) => {
          event.preventDefault()
          save.mutate()
        }}
      >
        <div className='space-y-2'>
          <Label htmlFor='setup-display-name'>Your name</Label>
          <Input
            id='setup-display-name'
            autoComplete='name'
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='setup-username'>Local username</Label>
          <Input
            id='setup-username'
            autoComplete='username'
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            pattern='[a-z][a-z0-9_-]*'
            required
          />
          <p className='text-xs text-muted-foreground'>
            Lowercase letters, numbers, underscore, and hyphen. Local to
            AgentGate.
          </p>
        </div>
        {save.error instanceof Error ? (
          <p className='text-sm text-destructive'>{save.error.message}</p>
        ) : null}
        <Button
          type='submit'
          disabled={!displayName.trim() || !username.trim() || save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save identity and continue'}
        </Button>
      </form>
    </SetupFrame>
  )
}

export function SetupCompanionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [personality, setPersonality] = useState('')
  const [boundaries, setBoundaries] = useState(
    'Tool permissions, secrets, external effects, and system actions remain controlled by ToolGate and owner approvals.'
  )
  const save = useMutation({
    mutationFn: () =>
      putAgentGate('/api/character', {
        name: name.trim(),
        owner_name: ownerName.trim(),
        personality: personality.trim(),
        background: '',
        boundaries,
        mode: 'companion',
        primary_model: '',
        fallback_model: '',
        allowed_tools: '',
        allowed_skills: '',
        avatar_label: '',
        emotion_pack: 'none',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agentgate'] })
      void navigate({ to: '/' })
    },
  })
  const defer = useMutation({
    mutationFn: () => postAgentGate('/api/setup/steps/companion/defer'),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['agentgate', 'setup'] })
      void navigate({ to: '/' })
    },
  })
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    save.mutate()
  }
  return (
    <SetupFrame>
      <ScreenHeading
        optional
        title='Create your Companion'
        description='Choose your own identity and behavior. No default Companion, model, provider, or tool permission is created.'
      />
      <form className='max-w-3xl space-y-5' onSubmit={submit}>
        <div className='grid gap-4 sm:grid-cols-2'>
          <div className='space-y-2'>
            <Label htmlFor='setup-companion-name'>Companion name</Label>
            <Input
              id='setup-companion-name'
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='setup-owner-address'>
              What should it call you?
            </Label>
            <Input
              id='setup-owner-address'
              value={ownerName}
              onChange={(event) => setOwnerName(event.target.value)}
            />
          </div>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='setup-personality'>
            Personality and working style
          </Label>
          <Textarea
            id='setup-personality'
            className='min-h-28'
            value={personality}
            onChange={(event) => setPersonality(event.target.value)}
            placeholder='Direct, calm, curious, concise…'
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='setup-boundaries'>Boundaries</Label>
          <Textarea
            id='setup-boundaries'
            className='min-h-24'
            value={boundaries}
            onChange={(event) => setBoundaries(event.target.value)}
          />
        </div>
        <div className='flex flex-wrap gap-2 border-t pt-5'>
          <Button type='submit' disabled={!name.trim() || save.isPending}>
            {save.isPending ? 'Creating…' : 'Create Companion'}
          </Button>
          <Button
            type='button'
            variant='outline'
            disabled={defer.isPending}
            onClick={() => defer.mutate()}
          >
            Continue without a Companion
          </Button>
        </div>
        {defer.error instanceof Error ? (
          <p className='text-sm text-destructive'>
            Could not defer Companion setup: {defer.error.message}
          </p>
        ) : null}
        <p className='text-xs leading-5 text-muted-foreground'>
          Companion is an optional module. Deferring it does not create a hidden
          profile; opening Companion later returns here.
        </p>
      </form>
    </SetupFrame>
  )
}
