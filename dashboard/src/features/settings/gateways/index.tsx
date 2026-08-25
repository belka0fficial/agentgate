import { useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Cable,
  CheckCircle2,
  CircleAlert,
  KeyRound,
  LockKeyhole,
  Network,
  RadioTower,
  RefreshCw,
  Router,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  checkModelRoute,
  getAgentGate,
  getGatewayHealth,
  getModelGatewayCandidates,
  getModelProviders,
  getOwnerSession,
  saveModelRoute,
  type GatewayHealth,
  type ModelGatewayCandidates,
  type ModelProvider,
  type ModelRouteProbe,
  type ModelRouteSaveResult,
  type OwnerSession,
} from '@/features/agentgate/api'
import { ContentSection } from '../components/content-section'

type Agent = {
  id: string
  name?: string
  primary_provider?: string
  primary_model?: string
  fallback_provider?: string
  fallback_model?: string
}

type AgentsPayload = { agents: Agent[] }

type QueryBlock = {
  session?: OwnerSession
  health?: GatewayHealth
  providers?: ModelProvider[]
  gateway?: ModelGatewayCandidates
  agents?: Agent[]
  loading: boolean
  error?: Error
  refresh: () => void
}

const gatewayRows = [
  {
    name: 'AgentGate UI',
    role: 'Owner settings and control plane',
    channel: 'same-origin browser calls',
    status: 'local',
  },
  {
    name: 'Pi adapter',
    role: 'Runtime facade and owner-auth boundary',
    channel: '/api/* + /health through Vite proxy',
    status: 'source-bound',
  },
  {
    name: 'MemoryGate',
    role: 'Scoped context and evidence memory',
    channel: 'Pi adapter gate client',
    status: 'behind facade',
  },
  {
    name: 'ToolGate',
    role: 'Tool execution policy, approvals, audit',
    channel: 'Pi adapter gate client',
    status: 'approval boundary',
  },
  {
    name: 'SystemGate',
    role: 'Read-only host telemetry',
    channel: 'Pi adapter gate client',
    status: 'read-only',
  },
]

export function GatewaySettings() {
  const session = useQuery({
    queryKey: ['agentgate', 'owner-session'],
    queryFn: getOwnerSession,
    retry: false,
  })
  const health = useQuery({
    queryKey: ['agentgate', 'gateway-health'],
    queryFn: getGatewayHealth,
    retry: false,
  })
  const providers = useQuery({
    queryKey: ['agentgate', 'model-providers'],
    queryFn: getModelProviders,
    retry: false,
  })
  const gateway = useQuery({
    queryKey: ['agentgate', 'model-gateway-candidates'],
    queryFn: getModelGatewayCandidates,
    retry: false,
  })
  const agents = useQuery({
    queryKey: ['agentgate', 'agents'],
    queryFn: () => getAgentGate<AgentsPayload>('/api/agents'),
    retry: false,
  })

  const block: QueryBlock = {
    session: session.data,
    health: health.data,
    providers: providers.data?.providers,
    gateway: gateway.data,
    agents: agents.data?.agents,
    loading:
      session.isLoading || health.isLoading || providers.isLoading || gateway.isLoading || agents.isLoading,
    error: firstError(session.error, health.error, providers.error, gateway.error, agents.error),
    refresh: () => {
      void session.refetch()
      void health.refetch()
      void providers.refetch()
      void gateway.refetch()
      void agents.refetch()
    },
  }

  return (
    <ContentSection
      title='Gateways'
      desc='Configure and inspect the private channel between AgentGate, Pi, providers, MemoryGate, ToolGate, and SystemGate.'
    >
      <GatewaySettingsBody block={block} />
    </ContentSection>
  )
}

function GatewaySettingsBody({ block }: { block: QueryBlock }) {
  const queryClient = useQueryClient()
  const defaultAgent = useMemo(
    () => block.agents?.find((agent) => agent.id === 'agent_pi_operator') ?? block.agents?.[0],
    [block.agents]
  )
  const [routeForm, setRouteForm] = useState({
    primary_provider: '',
    primary_model: '',
    fallback_provider: '',
    fallback_model: '',
    reason: '',
  })
  const [routeCheck, setRouteCheck] = useState<ModelRouteProbe | null>(null)
  const [routeSaveResult, setRouteSaveResult] = useState<ModelRouteSaveResult | null>(null)

  useEffect(() => {
    if (!defaultAgent) return
    setRouteForm({
      primary_provider: defaultAgent.primary_provider || '',
      primary_model: defaultAgent.primary_model || '',
      fallback_provider: defaultAgent.fallback_provider || '',
      fallback_model: defaultAgent.fallback_model || '',
      reason: '',
    })
    setRouteCheck(null)
    setRouteSaveResult(null)
  }, [defaultAgent])

  const checkRoute = useMutation({
    mutationFn: () => checkModelRoute(routeForm.primary_provider, routeForm.primary_model),
    onSuccess: setRouteCheck,
  })
  const saveRoute = useMutation({
    mutationFn: () =>
      saveModelRoute(defaultAgent?.id || 'agent_pi_operator', {
        primary_provider: routeForm.primary_provider,
        primary_model: routeForm.primary_model,
        fallback_provider: routeForm.fallback_provider,
        fallback_model: routeForm.fallback_model,
        reason: routeForm.reason,
      }),
    onSuccess: async (result) => {
      setRouteSaveResult(result)
      await queryClient.invalidateQueries({ queryKey: ['agentgate', 'agents'] })
    },
  })
  const gateway = block.gateway?.gateway
  const blockers = block.gateway?.setup?.blockers ?? []

  if (block.loading) {
    return <GatewaySkeleton />
  }

  return (
    <div className='grid gap-6 lg:max-w-5xl'>
      <div className='flex flex-col gap-3 rounded-xl border bg-card/50 p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <p className='text-sm font-medium'>Gateway control plane</p>
          <p className='text-xs leading-5 text-muted-foreground'>
            One owner-facing settings surface for the shared local channel. Secrets stay server-side; the browser only receives metadata.
          </p>
        </div>
        <Button variant='outline' size='sm' onClick={block.refresh}>
          <RefreshCw className='me-2 size-4' /> Refresh
        </Button>
      </div>

      {block.error ? (
        <div className='rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
          {block.error.message}
        </div>
      ) : null}

      <div className='grid gap-4 md:grid-cols-3'>
        <StatusCard
          icon={LockKeyhole}
          title='Owner session'
          value={block.session?.owner_authenticated ? 'authenticated' : 'locked'}
          status={block.session?.owner_authenticated ? 'ok' : 'blocked'}
          detail={`${block.session?.auth_mode ?? 'unknown'} · ${block.session?.token_storage ?? 'metadata only'}`}
        />
        <StatusCard
          icon={RadioTower}
          title='Pi adapter'
          value={block.health?.status ?? 'unknown'}
          status={block.health?.status === 'ok' ? 'ok' : 'blocked'}
          detail={`${block.health?.service ?? 'not loaded'} · owner auth ${block.health?.owner_auth ?? 'unknown'}`}
        />
        <StatusCard
          icon={Router}
          title='Model gateway'
          value={gateway?.status ?? 'unknown'}
          status={gateway?.status === 'ok' ? 'ok' : gateway?.status === 'auth_required' ? 'warn' : 'blocked'}
          detail={`${gateway?.name ?? 'provider pending'} · ${block.gateway?.candidate_count ?? 0} candidates`}
        />
      </div>

      <section className='grid gap-3'>
        <SectionTitle
          icon={Workflow}
          title='Shared channel'
          desc='Professional boundary: every gate talks through the Pi adapter facade, not through browser secrets or random direct sockets.'
        />
        <div className='overflow-hidden rounded-xl border'>
          {gatewayRows.map((row, index) => (
            <div
              key={row.name}
              className='grid gap-2 border-b p-4 last:border-b-0 md:grid-cols-[180px_1fr_220px_140px] md:items-center'
            >
              <div className='font-medium'>{row.name}</div>
              <div className='text-sm text-muted-foreground'>{row.role}</div>
              <code className='text-xs text-muted-foreground'>{row.channel}</code>
              <Badge variant={index === 0 ? 'secondary' : 'outline'}>{row.status}</Badge>
            </div>
          ))}
        </div>
      </section>

      <section className='grid gap-3'>
        <SectionTitle
          icon={KeyRound}
          title='Owner auth and CSRF'
          desc='Session details are metadata-only. The dashboard token is never returned to the browser.'
        />
        <div className='grid gap-3 rounded-xl border p-4 sm:grid-cols-2'>
          <Field label='Auth mode' value={block.session?.auth_mode ?? 'unknown'} />
          <Field label='Token storage' value={block.session?.token_storage ?? 'unknown'} />
          <Field label='CSRF required' value={String(block.session?.csrf_required ?? false)} />
          <Field label='Session expires' value={formatDate(block.session?.session_expires_at)} />
          <Field label='Credentials included' value={String(block.session?.credentials_included ?? false)} />
          <Field label='Token included' value={String(block.session?.token_included ?? false)} />
        </div>
      </section>

      <section className='grid gap-3'>
        <SectionTitle
          icon={Router}
          title='Edit active model route'
          desc='Change the provider/model labels the Pi operator uses. Save either applies immediately or queues a ToolGate approval when the route is risky.'
        />
        <ModelRouteEditor
          form={routeForm}
          setForm={setRouteForm}
          checkResult={routeCheck}
          saveResult={routeSaveResult}
          onCheck={() => checkRoute.mutate()}
          onSave={() => saveRoute.mutate()}
          checking={checkRoute.isPending}
          saving={saveRoute.isPending}
          checkError={checkRoute.error}
          saveError={saveRoute.error}
          disabled={!defaultAgent}
        />
      </section>

      <section className='grid gap-3'>
        <SectionTitle
          icon={Cable}
          title='Providers and current route'
          desc='Provider keys and upstream URLs stay server-side. This page only shows safe labels and readiness metadata.'
        />
        <div className='grid gap-4 xl:grid-cols-[1fr_320px]'>
          <div className='grid gap-3'>
            {(block.providers ?? []).map((provider) => (
              <ProviderCard key={provider.id} provider={provider} />
            ))}
            {!block.providers?.length ? (
              <EmptyCard title='No provider metadata' desc='Pi did not return provider metadata yet.' />
            ) : null}
          </div>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Default agent route</CardTitle>
              <CardDescription>Current route labels for the Pi operator.</CardDescription>
            </CardHeader>
            <CardContent className='grid gap-3'>
              <Field label='Agent' value={defaultAgent?.name ?? defaultAgent?.id ?? 'unknown'} />
              <Field label='Primary provider' value={defaultAgent?.primary_provider || 'not configured'} />
              <Field label='Primary model' value={defaultAgent?.primary_model || 'not configured'} />
              <Field label='Fallback provider' value={defaultAgent?.fallback_provider || 'disabled'} />
              <Field label='Fallback model' value={defaultAgent?.fallback_model || 'disabled'} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className='grid gap-3'>
        <SectionTitle
          icon={ShieldCheck}
          title='Safety boundary'
          desc='This is what the gateway settings page intentionally does not expose.'
        />
        <div className='grid gap-2 rounded-xl border p-4 text-sm text-muted-foreground sm:grid-cols-2'>
          {[
            'No provider API keys in browser',
            'No gate admin keys in browser',
            'No raw prompts or hidden instructions',
            'No memory contents by default',
            'No tool arguments or shell commands',
            'No provider upstream URLs',
            'No host paths or env dumps',
            'No automatic fallback routing yet',
          ].map((item) => (
            <div key={item} className='flex items-center gap-2'>
              <CheckCircle2 className='size-4 text-emerald-500' />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {blockers.length ? (
        <section className='grid gap-3'>
          <SectionTitle
            icon={CircleAlert}
            title='Setup blockers'
            desc='Source-bound blockers from the Pi adapter gateway setup payload.'
          />
          <div className='grid gap-2'>
            {blockers.map((blocker) => (
              <div key={blocker} className='rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300'>
                {blocker}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}

function ModelRouteEditor({
  form,
  setForm,
  checkResult,
  saveResult,
  onCheck,
  onSave,
  checking,
  saving,
  checkError,
  saveError,
  disabled,
}: {
  form: {
    primary_provider: string
    primary_model: string
    fallback_provider: string
    fallback_model: string
    reason: string
  }
  setForm: Dispatch<SetStateAction<{
    primary_provider: string
    primary_model: string
    fallback_provider: string
    fallback_model: string
    reason: string
  }>>
  checkResult: ModelRouteProbe | null
  saveResult: ModelRouteSaveResult | null
  onCheck: () => void
  onSave: () => void
  checking: boolean
  saving: boolean
  checkError: Error | null
  saveError: Error | null
  disabled: boolean
}) {
  const canCheck = Boolean(form.primary_provider.trim() && form.primary_model.trim())
  const canSave = canCheck && !saving && !disabled
  return (
    <Card>
      <CardContent className='grid gap-4 pt-6'>
        <div className='grid gap-4 md:grid-cols-2'>
          <LabeledInput
            label='Primary provider'
            value={form.primary_provider}
            placeholder='openai-codex, pi, openrouter...'
            disabled={disabled}
            onChange={(value) => setForm((current) => ({ ...current, primary_provider: value }))}
          />
          <LabeledInput
            label='Primary model'
            value={form.primary_model}
            placeholder='model label from provider metadata'
            disabled={disabled}
            onChange={(value) => setForm((current) => ({ ...current, primary_model: value }))}
          />
          <LabeledInput
            label='Fallback provider'
            value={form.fallback_provider}
            placeholder='optional; leave blank to disable'
            disabled={disabled}
            onChange={(value) => setForm((current) => ({ ...current, fallback_provider: value }))}
          />
          <LabeledInput
            label='Fallback model'
            value={form.fallback_model}
            placeholder='optional; leave blank to disable'
            disabled={disabled}
            onChange={(value) => setForm((current) => ({ ...current, fallback_model: value }))}
          />
        </div>
        <div className='grid gap-2'>
          <label className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>Reason</label>
          <Textarea
            value={form.reason}
            disabled={disabled}
            placeholder='Why this route should be saved. Required for approval context when a route is risky.'
            onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
          />
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' onClick={onCheck} disabled={!canCheck || checking || disabled}>
            {checking ? 'Checking...' : 'Check route'}
          </Button>
          <Button type='button' onClick={onSave} disabled={!canSave}>
            {saving ? 'Saving...' : 'Save route'}
          </Button>
        </div>
        {checkError ? <Message tone='bad'>{checkError.message}</Message> : null}
        {saveError ? <Message tone='bad'>{saveError.message}</Message> : null}
        {checkResult ? (
          <Message tone={checkResult.status === 'ready' ? 'good' : 'warn'}>
            Route check: {checkResult.status}. {checkResult.note}
          </Message>
        ) : null}
        {saveResult ? (
          <Message tone={saveResult.status === 'applied' || saveResult.status === 'unchanged' ? 'good' : 'warn'}>
            Save result: {saveResult.status}
            {saveResult.request_id ? ` · ToolGate request ${saveResult.request_id}` : ''}
            {saveResult.approval_reasons?.length ? ` · ${saveResult.approval_reasons.join('; ')}` : ''}
          </Message>
        ) : null}
      </CardContent>
    </Card>
  )
}

function LabeledInput({
  label,
  value,
  placeholder,
  disabled,
  onChange,
}: {
  label: string
  value: string
  placeholder: string
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className='grid gap-2'>
      <label className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>{label}</label>
      <Input value={value} placeholder={placeholder} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}

function Message({ tone, children }: { tone: 'good' | 'warn' | 'bad'; children: ReactNode }) {
  const className =
    tone === 'good'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : tone === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
        : 'border-destructive/40 bg-destructive/10 text-destructive'
  return <div className={`rounded-lg border p-3 text-sm leading-6 ${className}`}>{children}</div>
}

function StatusCard({
  icon: Icon,
  title,
  value,
  detail,
  status,
}: {
  icon: typeof LockKeyhole
  title: string
  value: string
  detail: string
  status: 'ok' | 'warn' | 'blocked'
}) {
  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
        <CardTitle className='text-sm font-medium'>{title}</CardTitle>
        <Icon className='size-4 text-muted-foreground' />
      </CardHeader>
      <CardContent>
        <div className='flex items-center gap-2'>
          <Badge variant={status === 'ok' ? 'secondary' : status === 'warn' ? 'outline' : 'destructive'}>{value}</Badge>
        </div>
        <p className='mt-2 text-xs text-muted-foreground'>{detail}</p>
      </CardContent>
    </Card>
  )
}

function ProviderCard({ provider }: { provider: ModelProvider }) {
  const status = provider.status === 'ok' ? 'secondary' : 'outline'
  return (
    <Card>
      <CardHeader className='pb-3'>
        <div className='flex items-start justify-between gap-3'>
          <div>
            <CardTitle className='text-base'>{provider.name}</CardTitle>
            <CardDescription>{provider.kind}</CardDescription>
          </div>
          <Badge variant={status}>{provider.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className='grid gap-3 text-sm'>
        <div className='grid gap-3 sm:grid-cols-3'>
          <Field label='Configured' value={String(provider.configured)} />
          <Field label='Models visible' value={String(provider.models_visible)} />
          <Field label='Model count' value={String(provider.model_count ?? 0)} />
        </div>
        {provider.privacy || provider.setup_hint ? (
          <p className='text-xs leading-5 text-muted-foreground'>
            {provider.privacy ?? provider.setup_hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

function SectionTitle({ icon: Icon, title, desc }: { icon: typeof Network; title: string; desc: string }) {
  return (
    <div className='flex items-start gap-3'>
      <div className='mt-0.5 rounded-md border bg-muted/40 p-2'>
        <Icon className='size-4 text-muted-foreground' />
      </div>
      <div>
        <h4 className='font-medium'>{title}</h4>
        <p className='text-sm leading-6 text-muted-foreground'>{desc}</p>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className='text-xs font-medium uppercase tracking-wide text-muted-foreground'>{label}</p>
      <p className='mt-1 break-words font-mono text-xs'>{value}</p>
    </div>
  )
}

function EmptyCard({ title, desc }: { title: string; desc: string }) {
  return (
    <Card>
      <CardContent className='py-8 text-center'>
        <p className='text-sm font-medium'>{title}</p>
        <p className='mt-1 text-xs text-muted-foreground'>{desc}</p>
      </CardContent>
    </Card>
  )
}

function GatewaySkeleton() {
  return (
    <div className='grid gap-4 lg:max-w-5xl'>
      <Skeleton className='h-24 rounded-xl' />
      <div className='grid gap-4 md:grid-cols-3'>
        <Skeleton className='h-28 rounded-xl' />
        <Skeleton className='h-28 rounded-xl' />
        <Skeleton className='h-28 rounded-xl' />
      </div>
      <Skeleton className='h-72 rounded-xl' />
    </div>
  )
}

function firstError(...errors: unknown[]) {
  return errors.find((error): error is Error => error instanceof Error)
}

function formatDate(value?: string | null) {
  if (!value) return 'unknown'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'unknown'
  return date.toLocaleString()
}
