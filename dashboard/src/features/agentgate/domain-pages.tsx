import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Bot, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import { DomainShell } from './domain-shell'
import { AgentGateHeader } from './page-header'

type AgentRecord = {
  id: string
  name?: string
  label?: string
  status?: string
  source?: string
}

function statusVariant(status: string | undefined) {
  if (status === 'live') return 'default'
  if (status === 'blocked' || status === 'offline') return 'destructive'
  return 'outline'
}

export function CompanionPage() {
  const profile = useQuery({
    queryKey: ['agentgate', 'character'],
    queryFn: () =>
      getAgentGate<{
        configured?: boolean
        name?: string
        mode?: string
        primary_model?: string
        fallback_model?: string
        emotion_pack?: string
        avatar_label?: string
      }>('/api/character'),
  })
  const configured = Boolean(profile.data?.configured)
  return (
    <>
      <AgentGateHeader title='Companion' eyebrow='Main agent profile' />
      <Main>
        <section className='grid w-full gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'>
          <div className='space-y-2'>
            <div className='flex flex-wrap items-center gap-2'>
              <Bot className='size-5 text-muted-foreground' />
              <h2 className='text-lg font-medium'>
                {configured
                  ? profile.data?.name || 'Unnamed companion'
                  : 'No main companion selected'}
              </h2>
              <Badge variant={configured ? 'default' : 'outline'}>
                {configured ? 'configured' : 'setup needed'}
              </Badge>
            </div>
            <p className='text-sm leading-6 text-muted-foreground'>
              This page reflects the source-bound main companion profile. No
              mascot logo is forced here. Create or edit the companion in Agent
              Studio, including model route, tools, skills, avatar label, and
              emotion pack metadata.
            </p>
          </div>

          <dl className='grid gap-4 rounded-lg border p-4 text-sm md:grid-cols-2 xl:grid-cols-1'>
            <Info label='Mode' value={profile.data?.mode || 'not configured'} />
            <Info
              label='Primary model'
              value={profile.data?.primary_model || 'source default'}
            />
            <Info
              label='Fallback model'
              value={profile.data?.fallback_model || 'none'}
            />
            <Info
              label='Emotion pack'
              value={profile.data?.emotion_pack || 'none'}
            />
            <Info
              label='Avatar'
              value={profile.data?.avatar_label || 'none selected'}
            />
            <Info label='Source' value='AgentGate local profile' />
          </dl>

          <div className='rounded-lg border bg-muted/20 p-4'>
            <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
              Next action
            </p>
            <p className='mt-2 text-sm text-muted-foreground'>
              Use Agent Studio to create or edit the main companion. Permissions
              still belong to ToolGate.
            </p>
            <Button asChild className='mt-4'>
              <Link to='/character'>
                {configured ? 'Edit in Agent Studio' : 'Create companion'}
              </Link>
            </Button>
          </div>
        </section>
      </Main>
    </>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className='space-y-1'>
      <dt className='text-xs tracking-wide text-muted-foreground uppercase'>
        {label}
      </dt>
      <dd className='font-medium'>{value}</dd>
    </div>
  )
}

export function CapabilitiesPage() {
  return (
    <DomainShell
      title='Capabilities'
      eyebrow='Tools and skills'
      status='planned'
      purpose='Capabilities separates Tools, Skills, ToolGate Automations, and Connections from runtime Jobs.'
      source='ToolGate for tools, deterministic Automations, approvals, and audit; MemoryGate for future product Skills; runtime adapter for agent-visible capability summaries.'
      next='Next slice: split the current merged Automations API into Jobs plus ToolGate Automation summaries.'
    />
  )
}

export function OrchestrationPage() {
  return (
    <DomainShell
      title='Orchestration'
      eyebrow='Flows and runs'
      status='planned'
      purpose='Orchestration will show Teams, Flows, bounded Loops, Runs, traces, and handoff evidence without exposing hidden reasoning.'
      source='Pi runtime owns execution definitions and run events. AgentGate owns presentation drafts and trace review UX.'
      next='Next slice after Jobs/Capabilities: define and consume versioned Run/Trace events.'
    />
  )
}

export function WorkforcePage() {
  const agents = useQuery({
    queryKey: ['agentgate', 'agents'],
    queryFn: () =>
      getAgentGate<{ agents: AgentRecord[]; error?: unknown }>('/api/agents'),
  })
  const rows = agents.data?.agents ?? []
  return (
    <>
      <AgentGateHeader title='Agents' eyebrow='Inspect and route' />
      <Main>
        <div className='mb-6 flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
          <div className='space-y-2'>
            <p className='text-sm leading-6 text-muted-foreground'>
              Source-bound agent metadata from the Pi runtime. This is the
              Agents screen for inspecting available agents and choosing one in
              chats; hidden prompts, credentials, and broad runtime internals
              stay server-side.
            </p>
          </div>
          <Button variant='outline' size='sm' onClick={() => agents.refetch()}>
            <RefreshCw className='mr-2 size-4' />
            Refresh
          </Button>
        </div>

        {agents.isError ? (
          <p className='text-sm text-destructive'>Agent source unavailable.</p>
        ) : rows.length === 0 ? (
          <p className='text-sm text-muted-foreground'>
            No agents reported by the source.
          </p>
        ) : (
          <div className='divide-y rounded-md border'>
            {rows.map((agent) => (
              <div
                key={agent.id}
                className='flex flex-wrap items-center justify-between gap-3 p-4'
              >
                <div>
                  <h2 className='font-medium'>
                    {agent.name || agent.label || agent.id}
                  </h2>
                  <p className='text-xs text-muted-foreground'>
                    {agent.id} · source: {agent.source || 'brain'}
                  </p>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge variant={statusVariant(agent.status)}>
                    {agent.status || 'unknown'}
                  </Badge>
                  <Button asChild variant='outline' size='sm'>
                    <Link to='/chats'>Use in chat</Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Main>
    </>
  )
}
