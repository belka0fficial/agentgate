import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getOwnerSession, loginAgentGateOwner } from './api'

type OwnerGateProps = {
  children: ReactNode
}

export function OwnerGate({ children }: OwnerGateProps) {
  const queryClient = useQueryClient()
  const [ownerToken, setOwnerToken] = useState('')
  const session = useQuery({
    queryKey: ['agentgate', 'owner-session'],
    queryFn: getOwnerSession,
    retry: false,
  })
  const login = useMutation({
    mutationFn: () => loginAgentGateOwner(ownerToken),
    onSuccess: async () => {
      setOwnerToken('')
      await queryClient.invalidateQueries({ queryKey: ['agentgate'] })
    },
  })

  if (session.isLoading) {
    return <OwnerGateShell eyebrow='checking session' title='AgentGate is locked' />
  }

  if (session.data?.owner_authenticated) {
    return <>{children}</>
  }

  const errorMessage =
    login.error instanceof Error
      ? login.error.message
      : session.error instanceof Error
        ? session.error.message
        : ''

  return (
    <OwnerGateShell eyebrow='owner gate' title='AgentGate is locked'>
      <form
        className='mt-8 grid gap-4'
        onSubmit={(event) => {
          event.preventDefault()
          if (ownerToken.trim()) login.mutate()
        }}
      >
        <div className='grid gap-2'>
          <label className='text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground'>
            Dashboard password
          </label>
          <Input
            autoFocus
            autoComplete='off'
            className='h-11 bg-background/80'
            placeholder='Owner token'
            type='password'
            value={ownerToken}
            onChange={(event) => setOwnerToken(event.target.value)}
          />
        </div>
        <Button type='submit' disabled={!ownerToken.trim() || login.isPending}>
          Unlock dashboard
        </Button>
        {errorMessage ? (
          <p className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive'>
            {errorMessage}
          </p>
        ) : null}
      </form>
    </OwnerGateShell>
  )
}

function OwnerGateShell({
  children,
  eyebrow,
  title,
}: {
  children?: ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <main className='grid min-h-svh place-items-center bg-background px-4 text-foreground'>
      <section className='relative w-full max-w-md overflow-hidden rounded-3xl border bg-card/70 p-8 shadow-2xl shadow-black/20'>
        <div className='absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent' />
        <div className='space-y-3'>
          <p className='text-xs font-medium uppercase tracking-[0.28em] text-muted-foreground'>
            {eyebrow}
          </p>
          <h1 className='text-3xl font-bold tracking-tight'>{title}</h1>
          <p className='text-sm leading-6 text-muted-foreground'>
            This is a simple first-layer owner lock for local/Tailscale access.
            It blocks casual access before any AgentGate panels, memory, tools,
            chats, or system details render.
          </p>
        </div>
        {children}
      </section>
    </main>
  )
}
