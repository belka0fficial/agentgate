import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getOwnerBootstrap,
  getOwnerSession,
  loginAgentGateOwner,
  setupAgentGateOwner,
} from './api'

type OwnerGateProps = {
  children: ReactNode
}

export function OwnerGate({ children }: OwnerGateProps) {
  const queryClient = useQueryClient()
  const [ownerToken, setOwnerToken] = useState('')
  const [confirmToken, setConfirmToken] = useState('')
  const bootstrap = useQuery({
    queryKey: ['agentgate', 'owner-bootstrap'],
    queryFn: getOwnerBootstrap,
    retry: false,
  })
  const session = useQuery({
    queryKey: ['agentgate', 'owner-session'],
    queryFn: getOwnerSession,
    retry: false,
  })
  const isFirstRun = bootstrap.data?.setup_required === true
  const login = useMutation({
    mutationFn: () =>
      isFirstRun
        ? setupAgentGateOwner(ownerToken)
        : loginAgentGateOwner(ownerToken),
    onSuccess: async () => {
      setOwnerToken('')
      setConfirmToken('')
      await queryClient.invalidateQueries({ queryKey: ['agentgate'] })
    },
  })

  if (bootstrap.isLoading || session.isLoading) {
    return (
      <OwnerGateShell eyebrow='checking session' title='AgentGate is locked' />
    )
  }

  if (session.data?.owner_authenticated) {
    return <>{children}</>
  }

  const errorMessage =
    login.error instanceof Error
      ? login.error.message
      : !isFirstRun && session.error instanceof Error
        ? session.error.message
        : ''

  return (
    <OwnerGateShell
      eyebrow={isFirstRun ? 'First run setup' : 'owner gate'}
      title={
        isFirstRun ? 'Create your dashboard password' : 'AgentGate is locked'
      }
      description={
        isFirstRun
          ? 'AgentGate setup starts here. Create the local owner password; only a server-side verifier is stored. Identity and optional modules follow in reusable setup screens.'
          : undefined
      }
    >
      <form
        className='mt-8 grid gap-4'
        onSubmit={(event) => {
          event.preventDefault()
          if (ownerToken.trim() && (!isFirstRun || ownerToken === confirmToken))
            login.mutate()
        }}
      >
        <div className='grid gap-2'>
          <label className='text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase'>
            {isFirstRun ? 'New dashboard password' : 'Dashboard password'}
          </label>
          <Input
            autoFocus
            autoComplete='off'
            className='h-11 bg-background/80'
            placeholder={isFirstRun ? 'Create password' : 'Owner token'}
            type='password'
            value={ownerToken}
            onChange={(event) => setOwnerToken(event.target.value)}
          />
        </div>
        {isFirstRun ? (
          <div className='grid gap-2'>
            <label className='text-xs font-medium tracking-[0.24em] text-muted-foreground uppercase'>
              Confirm password
            </label>
            <Input
              autoComplete='off'
              className='h-11 bg-background/80'
              placeholder='Repeat password'
              type='password'
              value={confirmToken}
              onChange={(event) => setConfirmToken(event.target.value)}
            />
          </div>
        ) : null}
        <Button
          type='submit'
          disabled={
            !ownerToken.trim() ||
            login.isPending ||
            (isFirstRun && ownerToken !== confirmToken)
          }
        >
          {isFirstRun ? 'Create password and unlock' : 'Unlock dashboard'}
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
  description,
}: {
  children?: ReactNode
  eyebrow: string
  title: string
  description?: string
}) {
  return (
    <main className='grid min-h-svh bg-background text-foreground md:grid-cols-[240px_minmax(0,1fr)]'>
      <aside className='hidden border-r px-6 py-8 md:block'>
        <p className='text-sm font-semibold'>AgentGate</p>
        <p className='mt-1 text-xs text-muted-foreground'>Local owner setup</p>
        <ol className='mt-10 space-y-4 text-sm'>
          <li className='font-medium'>1 · Password</li>
          <li className='text-muted-foreground'>2 · Identity</li>
          <li className='text-muted-foreground'>3 · Companion choice</li>
        </ol>
      </aside>
      <section className='flex min-w-0 items-center px-6 py-10 md:px-12'>
        <div className='w-full max-w-xl'>
          <p className='text-xs font-medium tracking-[0.2em] text-muted-foreground uppercase'>
            {eyebrow}
          </p>
          <h1 className='mt-3 text-2xl font-semibold tracking-tight'>
            {title}
          </h1>
          <p className='mt-3 text-sm leading-6 text-muted-foreground'>
            {description ??
              'This owner lock protects local AgentGate data before dashboard, memory, tools, chats, or system details render.'}
          </p>
          {children}
          <p className='mt-6 text-xs text-muted-foreground'>
            AgentGate setup · local-first · no provider account required
          </p>
        </div>
      </section>
    </main>
  )
}
