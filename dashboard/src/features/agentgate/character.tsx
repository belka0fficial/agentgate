import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  Image,
  LinkIcon,
  Mic,
  MoreHorizontal,
  Play,
  Plus,
  RotateCcw,
  Speaker,
  Sparkles,
  Trash2,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from './page-header'
import { personas, soulForPersona, type Persona } from './personas'

export function CharacterPage() {
  return <CharacterListPage />
}

export function CharacterListPage() {
  const [role, setRole] = useState('all')
  const [sort, setSort] = useState('default')
  const [deleteArmed, setDeleteArmed] = useState<string | null>(null)
  const [studioOpen, setStudioOpen] = useState(false)
  const [suggestPersona, setSuggestPersona] = useState(false)
  const [responseLength, setResponseLength] = useState('balanced')

  const roles = ['all', ...Array.from(new Set(personas.map((p) => p.role)))]
  const roster = useMemo(() => {
    const filtered = personas.filter(
      (persona) => role === 'all' || persona.role === role
    )
    return [...filtered].sort((a, b) => {
      if (sort === 'used') return b.sessions - a.sessions
      if (sort === 'messages') return b.messages - a.messages
      if (sort === 'name') return a.name.localeCompare(b.name)
      return Number(Boolean(b.default)) - Number(Boolean(a.default))
    })
  }, [role, sort])

  return (
    <>
      <AgentGateHeader
        actions={
          <CharacterToolbar
            role={role}
            roles={roles}
            sort={sort}
            onRoleChange={setRole}
            onSortChange={setSort}
            onOpenStudio={() => setStudioOpen(true)}
          />
        }
      />
      <Main>
        <p className='mb-6 max-w-3xl text-sm text-muted-foreground'>
          Personas shape voice, posture, and scoped context. Tool permissions
          and hard limits still live in ToolGate.
        </p>

        <section>
          <div className='mb-3 border-b pb-3'>
            <h2 className='text-sm font-medium'>Persona roster</h2>
            <p className='text-xs text-muted-foreground'>
              Each persona carries its own SOUL export, voice, avatar, and
              scoped context.
            </p>
          </div>
          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {(roster.length ? roster : [personas[0]]).map((persona) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                armed={deleteArmed === persona.id}
                onArmDelete={() =>
                  setDeleteArmed(deleteArmed === persona.id ? null : persona.id)
                }
              />
            ))}
          </div>
        </section>

        <section className='mt-8'>
          <div className='mb-3 border-b pb-3'>
            <h2 className='text-sm font-medium'>Global defaults</h2>
            <p className='text-xs text-muted-foreground'>
              Applied when a chat does not choose a persona explicitly.
            </p>
          </div>
          <div className='grid gap-4 rounded-xl bg-card p-4 md:grid-cols-3'>
            <div className='space-y-2'>
              <Label>Fallback persona</Label>
              <Select defaultValue='hermes'>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {personas.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='flex items-center justify-between gap-4 rounded-lg bg-muted/35 px-4 py-3'>
              <div>
                <p className='text-sm font-medium'>Suggest persona</p>
                <p className='text-xs text-muted-foreground'>Default off</p>
              </div>
              <Switch
                checked={suggestPersona}
                onCheckedChange={setSuggestPersona}
              />
            </div>
            <div className='space-y-2'>
              <Label>Response length</Label>
              <Select value={responseLength} onValueChange={setResponseLength}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='brief'>Brief</SelectItem>
                  <SelectItem value='balanced'>Balanced</SelectItem>
                  <SelectItem value='expanded'>Expanded</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>
      </Main>
      <CharacterStudio open={studioOpen} onOpenChange={setStudioOpen} />
    </>
  )
}

export function CharacterDetailPage({ personaId }: { personaId: string }) {
  const persona =
    personas.find((candidate) => candidate.id === personaId) ?? personas[0]
  const [studioOpen, setStudioOpen] = useState(false)

  return (
    <>
      <AgentGateHeader
        title={persona.name}
        eyebrow='Persona detail'
        hideMoreActions
        leftExtra={
          <Badge variant='outline' className='hidden h-6 px-2 sm:inline-flex'>
            {persona.role}
          </Badge>
        }
        actions={
          <CharacterDetailToolbar
            persona={persona}
            onOpenStudio={() => setStudioOpen(true)}
          />
        }
      />
      <Main>
        <div className='mb-6 max-w-3xl'>
          <p className='text-sm text-muted-foreground'>{persona.identity}</p>
        </div>

        <div className='grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.9fr)]'>
          <div className='space-y-6'>
            <section>
              <SectionHeader
                title='Identity fields'
                description='Editable persona-level defaults used by chats.'
              />
              <div className='grid gap-4 rounded-xl bg-card p-4 md:grid-cols-2'>
                <Field label='Name' defaultValue={persona.name} />
                <Field label='Role' defaultValue={persona.role} />
                <div className='space-y-2 md:col-span-2'>
                  <Label>Identity</Label>
                  <Textarea
                    defaultValue={persona.identity}
                    className='min-h-28'
                  />
                </div>
              </div>
            </section>

            <section>
              <SectionHeader
                title='Boundaries'
                description='Persona-level; hard limits live in ToolGate.'
              />
              <Textarea
                defaultValue={persona.boundaries}
                className='min-h-32 rounded-xl bg-card'
              />
            </section>

            <section>
              <SectionHeader
                title='Linked memories'
                description='MemoryGate context this persona can read.'
              />
              <div className='rounded-xl bg-card p-4'>
                <div className='flex flex-wrap gap-2'>
                  {persona.memories.map((memory) => (
                    <Badge key={memory} variant='outline'>
                      {memory}
                    </Badge>
                  ))}
                </div>
                <Button variant='outline' size='sm' className='mt-4'>
                  Edit scoped context
                </Button>
              </div>
            </section>
          </div>

          <div className='space-y-6'>
            <SoulExport persona={persona} />
            <VersionHistory persona={persona} />
            <VoiceConfig persona={persona} />
          </div>
        </div>
      </Main>
      <CharacterStudio
        open={studioOpen}
        onOpenChange={setStudioOpen}
        basePersona={persona}
      />
    </>
  )
}

function CharacterToolbar({
  role,
  roles,
  sort,
  onRoleChange,
  onSortChange,
  onOpenStudio,
}: {
  role: string
  roles: string[]
  sort: string
  onRoleChange: (value: string) => void
  onSortChange: (value: string) => void
  onOpenStudio: () => void
}) {
  return (
    <>
      <CompactSelect value={role} onValueChange={onRoleChange}>
        {roles.map((item) => (
          <SelectItem key={item} value={item}>
            {item === 'all' ? 'All roles' : item}
          </SelectItem>
        ))}
      </CompactSelect>
      <CompactSelect value={sort} onValueChange={onSortChange}>
        <SelectItem value='default'>Default first</SelectItem>
        <SelectItem value='used'>Most used</SelectItem>
        <SelectItem value='messages'>Messages</SelectItem>
        <SelectItem value='name'>Name</SelectItem>
      </CompactSelect>
      <Button size='sm' className='h-8' onClick={onOpenStudio}>
        <Plus />
        New persona
      </Button>
    </>
  )
}

function CharacterDetailToolbar({
  onOpenStudio,
  persona,
}: {
  onOpenStudio: () => void
  persona: Persona
}) {
  const [deleteArmed, setDeleteArmed] = useState(false)

  return (
    <>
      <Button
        asChild
        variant='ghost'
        size='icon'
        className='size-8 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:size-4'
      >
        <Link to='/character' aria-label='Back to personas' title='Back'>
          <ArrowLeft />
        </Link>
      </Button>
      <Button size='sm' className='h-8' onClick={onOpenStudio}>
        <ExternalLink />
        Open in Studio
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            variant='ghost'
            size='icon'
            className='size-8 rounded-md text-muted-foreground hover:bg-muted/50 hover:text-foreground [&_svg]:size-4'
            aria-label={`${persona.name} actions`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end'>
          <DropdownMenuItem>
            <Copy />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem>
            <MoreHorizontal />
            Set default
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Download />
            Export SOUL
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className={deleteArmed ? 'text-destructive' : ''}
            onClick={() => setDeleteArmed((armed) => !armed)}
          >
            <Trash2 />
            {deleteArmed ? 'Confirm delete' : 'Delete'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function CompactSelect({
  value,
  onValueChange,
  children,
}: {
  value: string
  onValueChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className='h-8 w-36 border-0 bg-muted/45 px-2 shadow-none'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}

function PersonaCard({
  persona,
  armed,
  onArmDelete,
}: {
  persona: Persona
  armed: boolean
  onArmDelete: () => void
}) {
  return (
    <div className='group rounded-xl bg-card p-4 transition-colors hover:bg-card/80'>
      <Link
        to='/character/$id'
        params={{ id: persona.id }}
        className='block'
        aria-label={`Open ${persona.name}`}
      >
        <span className='flex min-w-0 items-start justify-between gap-3'>
          <span className='flex min-w-0 items-center gap-3'>
            <span className='grid size-10 shrink-0 place-items-center rounded-full bg-muted font-mono text-xs text-muted-foreground'>
              {persona.name.slice(0, 1)}
            </span>
            <span className='min-w-0'>
              <span className='flex min-w-0 items-center gap-1.5'>
                <span className='truncate text-sm font-medium'>
                  {persona.name}
                </span>
                {persona.default ? (
                  <Badge
                    variant='secondary'
                    className='px-1.5 py-0 text-[10px]'
                  >
                    default
                  </Badge>
                ) : null}
              </span>
              <Badge
                variant='outline'
                className='mt-1 w-fit px-1.5 py-0 text-[10px]'
              >
                {persona.role}
              </Badge>
            </span>
          </span>
        </span>
        <p className='mt-4 line-clamp-2 min-h-10 text-sm text-muted-foreground'>
          {persona.identity}
        </p>
        <div className='mt-4 rounded-lg bg-muted/30 px-3 py-2'>
          <div className='flex items-center gap-2'>
            <Speaker className='size-3.5 text-muted-foreground' />
            <p className='truncate font-mono text-[11px] text-muted-foreground'>
              {persona.voice}
            </p>
          </div>
        </div>
        <p className='mt-3 font-mono text-[11px] text-muted-foreground'>
          {persona.sessions} sessions · {persona.messages} msgs ·{' '}
          {persona.lastUsed}
        </p>
      </Link>
      <div className='mt-4 flex items-center justify-between gap-2 border-t pt-3'>
        <Button asChild variant='ghost' size='sm' className='h-8'>
          <Link to='/character/$id' params={{ id: persona.id }}>
            Edit
          </Link>
        </Button>
        <PersonaOverflow
          persona={persona}
          armed={armed}
          onArmDelete={onArmDelete}
        />
      </div>
    </div>
  )
}

function PersonaOverflow({
  persona,
  armed,
  onArmDelete,
}: {
  persona: Persona
  armed: boolean
  onArmDelete: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          size='icon'
          className='size-7'
          aria-label={`${persona.name} actions`}
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem>
          <Copy />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem>
          <MoreHorizontal />
          Set default
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Download />
          Export SOUL
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={armed ? 'text-destructive' : ''}
          onClick={onArmDelete}
        >
          <Trash2 />
          {armed ? 'Confirm delete' : 'Delete'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function SoulExport({ persona }: { persona: Persona }) {
  const [expanded, setExpanded] = useState(false)
  const soul = soulForPersona(persona)
  const preview = soul.split('\n').slice(0, 8).join('\n')

  return (
    <section>
      <SectionHeader
        title='SOUL export'
        description='Monochrome preview for the portable persona file.'
        action={
          <Button
            size='sm'
            variant='ghost'
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        }
      />
      <pre className='min-h-[420px] rounded-xl bg-card p-4 font-mono text-xs leading-5 whitespace-pre-wrap text-muted-foreground'>
        {expanded ? soul : preview}
      </pre>
    </section>
  )
}

function VersionHistory({ persona }: { persona: Persona }) {
  return (
    <section>
      <SectionHeader
        title='Version history'
        description='Most recent saves, with restore points.'
        action={
          <Button size='sm' variant='ghost'>
            See all
          </Button>
        }
      />
      <div className='space-y-2'>
        {persona.versions.slice(0, 2).map((version) => (
          <div key={version.id} className='rounded-xl bg-card p-4'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-xs font-medium'>
                {version.id} · {version.note}
              </p>
              <Button size='sm' variant='ghost'>
                <RotateCcw />
                Restore
              </Button>
            </div>
            <p className='mt-1 font-mono text-[11px] text-muted-foreground'>
              {version.at}
            </p>
            <code className='mt-3 block font-mono text-[11px] whitespace-pre-wrap text-muted-foreground'>
              {version.diff}
            </code>
          </div>
        ))}
      </div>
    </section>
  )
}

function VoiceConfig({ persona }: { persona: Persona }) {
  return (
    <section>
      <SectionHeader
        title='Voice config'
        description='Descriptor, sample playback, and regeneration.'
      />
      <div className='rounded-xl bg-card p-4'>
        <div className='flex items-center gap-2'>
          <Button size='icon' variant='ghost' className='size-8'>
            <Speaker />
          </Button>
          <Input defaultValue={persona.voice} />
        </div>
        <div className='mt-3 space-y-2'>
          {persona.sampleLines.slice(0, 3).map((line) => (
            <p key={line} className='rounded-md bg-muted/35 p-2 text-xs'>
              “{line}”
            </p>
          ))}
        </div>
        <Button size='sm' variant='outline' className='mt-3'>
          <Mic />
          Regenerate samples
        </Button>
      </div>
    </section>
  )
}

type StudioSetup = 'assistant' | 'character' | null
type BuildMethod = 'name' | 'reference' | 'image' | 'scratch' | null
type StudioField =
  | 'setup'
  | 'build'
  | 'name'
  | 'era'
  | 'background'
  | 'traits'
  | 'manner'
  | 'boundaries'
  | 'role'
  | 'voice'
  | 'preview'

type StudioStep = {
  id: StudioField
  label: string
  optional?: boolean
}

type StudioDraft = {
  setup: StudioSetup
  build: BuildMethod
  name: string
  era: string
  background: string
  traits: string
  manner: string
  boundaries: string
  role: string
  voice: string
}

const characterSteps: StudioStep[] = [
  { id: 'setup', label: 'Fork' },
  { id: 'build', label: 'Build' },
  { id: 'name', label: 'Name' },
  { id: 'era', label: 'Age / era', optional: true },
  { id: 'background', label: 'Origin' },
  { id: 'traits', label: 'Traits' },
  { id: 'manner', label: 'Manner' },
  { id: 'boundaries', label: 'Boundaries' },
  { id: 'role', label: 'Role' },
  { id: 'voice', label: 'Voice' },
  { id: 'preview', label: 'Preview' },
]

const assistantSteps: StudioStep[] = [
  { id: 'setup', label: 'Fork' },
  { id: 'name', label: 'Name' },
  { id: 'traits', label: 'Personality' },
  { id: 'manner', label: 'Manner' },
  { id: 'boundaries', label: 'Boundaries' },
  { id: 'role', label: 'Role' },
  { id: 'voice', label: 'Voice' },
  { id: 'preview', label: 'Preview' },
]

function CharacterStudio({
  basePersona,
  onOpenChange,
  open,
}: {
  basePersona?: Persona
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  const [stepIndex, setStepIndex] = useState(0)
  const [voiceStatus, setVoiceStatus] = useState<'idle' | 'mapping' | 'ready'>(
    'idle'
  )
  const [draft, setDraft] = useState<StudioDraft>(() =>
    basePersona ? studioDraftFromPersona(basePersona) : blankStudioDraft()
  )

  const steps = draft.setup === 'assistant' ? assistantSteps : characterSteps
  const step = steps[Math.min(stepIndex, steps.length - 1)]
  const descriptor = useMemo(() => mapDraftToVoice(draft), [draft])
  const completeness = useMemo(() => studioCompleteness(draft), [draft])

  useEffect(() => {
    if (open) {
      // The studio draft resets only when the owner opens the modal.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(0)
      setDraft(
        basePersona ? studioDraftFromPersona(basePersona) : blankStudioDraft()
      )
    }
  }, [basePersona, open])

  useEffect(() => {
    if (!open) return
    // Voice metadata is a deferred presentation preview; this effect does not install audio runtime.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setVoiceStatus('mapping')
    const handle = window.setTimeout(() => {
      setDraft((current) => ({ ...current, voice: mapDraftToVoice(current) }))
      setVoiceStatus('ready')
    }, 520)
    return () => window.clearTimeout(handle)
  }, [
    draft.background,
    draft.era,
    draft.manner,
    draft.name,
    draft.role,
    draft.traits,
    draft.voice,
    open,
  ])

  useEffect(() => {
    if (stepIndex > steps.length - 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStepIndex(steps.length - 1)
    }
  }, [stepIndex, steps.length])

  if (!open) return null

  const patchDraft = (patch: Partial<StudioDraft>) =>
    setDraft((current) => ({ ...current, ...patch }))
  const continueFlow = () =>
    setStepIndex((current) => Math.min(current + 1, steps.length - 1))
  const back = () => setStepIndex((current) => Math.max(current - 1, 0))
  const skip = () => {
    if (step.optional || step.id !== 'preview') continueFlow()
  }

  return (
    <div
      className='fixed inset-0 z-50 flex min-h-dvh flex-col overflow-hidden bg-background text-foreground'
      data-testid='character-studio'
    >
      <div className='flex h-16 shrink-0 items-center gap-4 border-b px-5'>
        <div>
          <p className='font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase'>
            Character Studio
          </p>
          <h2 className='text-sm font-medium'>Voice-first persona builder</h2>
        </div>
        <div className='flex min-w-0 flex-1 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          {steps.map((item, index) => (
            <button
              key={item.id}
              type='button'
              className={cn(
                'flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs transition-colors',
                index === stepIndex
                  ? 'bg-primary text-primary-foreground'
                  : index < stepIndex
                    ? 'bg-muted/70 text-foreground hover:bg-muted'
                    : 'text-muted-foreground'
              )}
              disabled={index > stepIndex}
              onClick={() => setStepIndex(index)}
            >
              <span className='font-mono text-[11px]'>
                {String(index).padStart(2, '0')}
              </span>
              {item.label}
            </button>
          ))}
        </div>
        <Button
          variant='ghost'
          size='icon'
          className='size-9'
          aria-label='Close Studio'
          onClick={() => onOpenChange(false)}
        >
          <X />
        </Button>
      </div>

      <div className='grid min-h-0 flex-1 gap-6 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_420px] xl:grid-cols-[minmax(0,1fr)_480px]'>
        <section className='flex min-h-[620px] flex-col justify-center'>
          <StudioQuestion
            draft={draft}
            step={step}
            onPatchDraft={patchDraft}
            onFillDraft={() => patchDraft(agentFillDraft(draft))}
          />
        </section>

        <aside className='flex min-h-[620px] flex-col gap-4'>
          <AvatarStage
            completeness={completeness}
            descriptor={descriptor}
            status={voiceStatus}
          />
          <CurrentCharacterSummary draft={draft} completeness={completeness} />
        </aside>
      </div>

      <div className='flex h-16 shrink-0 items-center justify-between border-t px-5'>
        <Button variant='ghost' onClick={back} disabled={stepIndex === 0}>
          Back
        </Button>
        <div className='flex items-center gap-2'>
          <Button variant='ghost' onClick={skip} disabled={step.id === 'setup'}>
            Skip
          </Button>
          <Button
            onClick={continueFlow}
            disabled={stepIndex === steps.length - 1}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

function StudioQuestion({
  draft,
  onFillDraft,
  onPatchDraft,
  step,
}: {
  draft: StudioDraft
  onFillDraft: () => void
  onPatchDraft: (patch: Partial<StudioDraft>) => void
  step: StudioStep
}) {
  if (step.id === 'setup') {
    return (
      <div className='max-w-3xl'>
        <p className='mb-3 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase'>
          Step 00
        </p>
        <h1 className='text-4xl font-semibold tracking-tight'>
          What are you setting up?
        </h1>
        <p className='mt-3 text-sm text-muted-foreground'>
          This fork controls how much story, appearance, and memory scope the
          Studio asks for.
        </p>
        <div className='mt-8 grid gap-4 md:grid-cols-2'>
          <ChoiceCard
            active={draft.setup === 'assistant'}
            icon={<Sparkles />}
            title='Assistant'
            description='Voice, speaking manner, personality, boundaries, response length. No appearance, backstory, or memories.'
            onClick={() =>
              onPatchDraft({ setup: 'assistant', role: 'practical' })
            }
          />
          <ChoiceCard
            active={draft.setup === 'character'}
            icon={<UserRound />}
            title='Character'
            description='Full persona path: origin, role, voice, scoped memories, avatar presence, and preview chat.'
            onClick={() => onPatchDraft({ setup: 'character' })}
          />
        </div>
      </div>
    )
  }

  if (step.id === 'build') {
    return (
      <div className='max-w-3xl'>
        <QuestionTitle
          title='How should I build the first draft?'
          why='Starting from a method gives the agent a safe source of truth before it proposes traits.'
        />
        <div className='grid gap-3 md:grid-cols-2'>
          <ChoiceCard
            active={draft.build === 'name'}
            icon={<UserRound />}
            title='From a name'
            description='The agent proposes traits and voice from the name alone.'
            onClick={() => onPatchDraft({ build: 'name' })}
          />
          <ChoiceCard
            active={draft.build === 'reference'}
            icon={<LinkIcon />}
            title='From a reference page'
            description='Paste a URL. Public figures and fiction are inspiration, never impersonation.'
            onClick={() => onPatchDraft({ build: 'reference' })}
          />
          <ChoiceCard
            active={draft.build === 'image'}
            icon={<Image />}
            title='From an image'
            description='Safety gate runs before analysis. Only style and palette may be derived.'
            onClick={() => onPatchDraft({ build: 'image' })}
          />
          <ChoiceCard
            active={draft.build === 'scratch'}
            icon={<WandSparkles />}
            title='From scratch'
            description='Manual, guided, one attribute at a time.'
            onClick={() => onPatchDraft({ build: 'scratch' })}
          />
        </div>
        {draft.build === 'reference' ? (
          <Input className='mt-5' placeholder='https://example.com/reference' />
        ) : null}
        {draft.build === 'image' ? (
          <div className='mt-5 rounded-xl bg-card p-4 text-sm text-muted-foreground'>
            Uploads are blocked before analysis if they are sexualized,
            suggestive, nude, minor-like, or depict a real identifiable private
            person. Use the silhouette if the image is rejected.
          </div>
        ) : null}
      </div>
    )
  }

  if (step.id === 'preview') {
    return <StudioPreviewChat draft={draft} />
  }

  const copy = studioFieldCopy[step.id]
  const value = draft[step.id] ?? ''
  const isLong = ['background', 'traits', 'manner', 'boundaries'].includes(
    step.id
  )

  return (
    <div className='max-w-3xl'>
      <QuestionTitle title={copy.title} why={copy.why} />
      {isLong ? (
        <Textarea
          value={value}
          onChange={(event) => onPatchDraft({ [step.id]: event.target.value })}
          placeholder={copy.placeholder}
          className='mt-7 min-h-44 rounded-xl bg-card text-base'
        />
      ) : (
        <Input
          value={value}
          onChange={(event) => onPatchDraft({ [step.id]: event.target.value })}
          placeholder={copy.placeholder}
          className='mt-7 h-12 rounded-xl bg-card text-base'
        />
      )}
      <div className='mt-5 flex flex-wrap items-center gap-3'>
        <Button variant='outline' onClick={onFillDraft}>
          <WandSparkles />
          Let the agent fill this in
        </Button>
        <p className='text-xs text-muted-foreground'>
          Proposals land as editable drafts. Nothing is auto-committed.
        </p>
      </div>
    </div>
  )
}

function QuestionTitle({ title, why }: { title: string; why: string }) {
  return (
    <>
      <p className='mb-3 font-mono text-xs tracking-[0.2em] text-muted-foreground uppercase'>
        Current question
      </p>
      <h1 className='text-4xl font-semibold tracking-tight'>{title}</h1>
      <p className='mt-3 text-sm text-muted-foreground'>{why}</p>
    </>
  )
}

function ChoiceCard({
  active,
  description,
  icon,
  onClick,
  title,
}: {
  active: boolean
  description: string
  icon: ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      type='button'
      className={cn(
        'rounded-xl bg-card p-5 text-left transition-colors hover:bg-card/80',
        active && 'ring-1 ring-primary'
      )}
      onClick={onClick}
    >
      <span className='mb-4 grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4'>
        {icon}
      </span>
      <span className='block text-base font-medium'>{title}</span>
      <span className='mt-2 block text-sm leading-6 text-muted-foreground'>
        {description}
      </span>
    </button>
  )
}

function AvatarStage({
  completeness,
  descriptor,
  status,
}: {
  completeness: number
  descriptor: string
  status: 'idle' | 'mapping' | 'ready'
}) {
  const detail = Math.max(0.18, completeness)

  return (
    <div className='relative min-h-[420px] overflow-hidden rounded-2xl bg-card p-6'>
      <div className='absolute inset-0 bg-[radial-gradient(circle_at_50%_28%,hsl(var(--muted)/0.42),transparent_42%)]' />
      <div className='relative flex h-full flex-col items-center justify-center'>
        <div
          className='relative h-64 w-44 transition-all duration-700'
          style={{
            opacity: 0.42 + detail * 0.52,
            filter: `blur(${3 - detail * 3}px)`,
          }}
        >
          <div className='absolute top-3 left-1/2 h-24 w-24 -translate-x-1/2 rounded-full bg-muted/80 shadow-[0_0_90px_hsl(var(--muted)/0.38)]' />
          <div className='absolute top-28 left-1/2 h-36 w-32 -translate-x-1/2 rounded-[48%_48%_18%_18%] bg-muted/65' />
          <div
            className='absolute top-7 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full border border-foreground/15'
            style={{ opacity: detail }}
          />
          <div
            className='absolute top-40 left-8 h-20 w-1 rounded-full bg-foreground/20'
            style={{ opacity: detail * 0.8 }}
          />
          <div
            className='absolute top-40 right-8 h-20 w-1 rounded-full bg-foreground/20'
            style={{ opacity: detail * 0.8 }}
          />
        </div>
        <div className='mt-8 w-full rounded-xl bg-muted/30 p-3'>
          <div className='flex items-center justify-between gap-3'>
            <p className='text-xs font-medium'>Voice descriptor</p>
            <Badge variant='outline' className='font-mono text-[10px]'>
              {status === 'mapping' ? 'mapping' : 'sample ready'}
            </Badge>
          </div>
          <p className='mt-2 font-mono text-[11px] leading-5 text-muted-foreground'>
            {descriptor}
          </p>
          <div className='mt-3 flex items-center gap-1.5'>
            {Array.from({ length: 22 }).map((_, index) => (
              <span
                key={index}
                className='w-1 rounded-full bg-primary/70'
                style={{
                  height: `${8 + ((index * 7) % 22) * detail}px`,
                  opacity: status === 'mapping' ? 0.55 : 0.9,
                }}
              />
            ))}
          </div>
          <Button variant='outline' size='sm' className='mt-3'>
            <Play />
            Play fixture sample
          </Button>
        </div>
      </div>
    </div>
  )
}

function CurrentCharacterSummary({
  completeness,
  draft,
}: {
  completeness: number
  draft: StudioDraft
}) {
  const rows = [
    ['type', draft.setup ?? 'undecided'],
    ['method', draft.build ?? 'manual'],
    ['name', draft.name || 'unnamed'],
    ['role', draft.role || 'unassigned'],
    ['voice', draft.voice || mapDraftToVoice(draft)],
  ]

  return (
    <div className='rounded-2xl bg-card p-5'>
      <div className='flex items-center justify-between gap-4'>
        <div>
          <h3 className='text-sm font-medium'>Current character</h3>
          <p className='text-xs text-muted-foreground'>
            Fills in as the owner answers.
          </p>
        </div>
        <span className='font-mono text-xs text-muted-foreground'>
          {Math.round(completeness * 100)}%
        </span>
      </div>
      <div className='mt-4 space-y-2'>
        {rows.map(([label, value]) => (
          <div key={label} className='flex items-start justify-between gap-4'>
            <span className='text-xs text-muted-foreground'>{label}</span>
            <span className='max-w-[260px] text-right font-mono text-[11px] text-foreground'>
              {value}
            </span>
          </div>
        ))}
      </div>
      <div className='mt-4 h-1.5 overflow-hidden rounded-full bg-muted'>
        <div
          className='h-full rounded-full bg-primary transition-all'
          style={{ width: `${Math.round(completeness * 100)}%` }}
        />
      </div>
    </div>
  )
}

function StudioPreviewChat({ draft }: { draft: StudioDraft }) {
  return (
    <div className='max-w-3xl'>
      <QuestionTitle
        title='Try the character before saving.'
        why='The final pass confirms SOUL, voice, and boundaries before any version is written.'
      />
      <div className='mt-7 space-y-5 rounded-2xl bg-card p-5'>
        <div className='ml-auto max-w-[70%] rounded-xl bg-muted p-3 text-sm'>
          Give me the owner-facing summary. Keep it calm.
        </div>
        <div className='max-w-[72ch] text-sm leading-7'>
          <p className='mb-1 text-xs text-muted-foreground'>
            {draft.name || 'New persona'} · fixture voice on
          </p>
          <p>
            Here is the short version: the persona is coherent, the boundary
            language is explicit, and the voice is ready for a saved sample.
          </p>
        </div>
        <div className='ml-auto max-w-[70%] rounded-xl bg-muted p-3 text-sm'>
          What would you refuse?
        </div>
        <div className='max-w-[72ch] text-sm leading-7'>
          <p className='mb-1 text-xs text-muted-foreground'>
            {draft.name || 'New persona'} · boundaries active
          </p>
          <p>
            I would refuse identity deception, unsafe image use, and tool
            actions outside the owner-approved ToolGate policy.
          </p>
        </div>
      </div>
      <div className='mt-5 rounded-xl bg-card p-4'>
        <p className='text-sm font-medium'>Save package preview</p>
        <p className='mt-1 text-xs text-muted-foreground'>
          Saving writes SOUL export, voice config, avatar assets, and a version
          diff against the previous save.
        </p>
      </div>
    </div>
  )
}

const studioFieldCopy: Record<
  Exclude<StudioField, 'setup' | 'build' | 'preview'>,
  { placeholder: string; title: string; why: string }
> = {
  name: {
    title: 'What is the persona called?',
    why: 'The name anchors how the agent proposes voice, posture, and summary language.',
    placeholder: 'Hermes',
  },
  era: {
    title: 'What age, era, or time signature matters?',
    why: 'Optional context can shape vocabulary without storing appearance or body attributes.',
    placeholder: 'present-day, old-world, near-future...',
  },
  background: {
    title: 'Where does this character come from?',
    why: 'Origin gives the persona texture, but hard limits still live outside the story.',
    placeholder: 'A local console guide shaped by operations work...',
  },
  traits: {
    title: 'Which personality traits should stay visible?',
    why: 'Traits guide behavior when the agent has several acceptable ways to respond.',
    placeholder: 'calm, skeptical, protective, playful...',
  },
  manner: {
    title: 'How should it speak?',
    why: 'Speaking manner becomes the bridge between text tone and voice synthesis.',
    placeholder: 'short sentences, low drama, precise caveats...',
  },
  boundaries: {
    title: 'What are the persona-level boundaries?',
    why: 'This is style and conduct only; ToolGate remains the hard enforcement layer.',
    placeholder: 'No impersonation, no silent persona switching...',
  },
  role: {
    title: 'What practical role tag should it carry?',
    why: 'The chat composer uses role tags for manual persona selection.',
    placeholder: 'practical, educational, motivation, reflective...',
  },
  voice: {
    title: 'What should the voice feel like?',
    why: 'The descriptor is regenerated after relevant edits, then sent to TTS when available.',
    placeholder: 'low pitch · measured pace · warm edge · steady energy',
  },
}

function studioDraftFromPersona(persona: Persona): StudioDraft {
  return {
    setup: 'character',
    build: 'scratch',
    name: persona.name,
    era: '',
    background: persona.identity,
    traits: persona.identity,
    manner: persona.voice,
    boundaries: persona.boundaries,
    role: persona.role.toLowerCase(),
    voice: persona.voice,
  }
}

function blankStudioDraft(): StudioDraft {
  return {
    setup: null,
    build: null,
    name: '',
    era: '',
    background: '',
    traits: '',
    manner: '',
    boundaries: '',
    role: '',
    voice: '',
  }
}

function studioCompleteness(draft: StudioDraft) {
  const fields = [
    draft.setup,
    draft.build,
    draft.name,
    draft.background,
    draft.traits,
    draft.manner,
    draft.boundaries,
    draft.role,
    draft.voice,
  ]
  return fields.filter(Boolean).length / fields.length
}

function mapDraftToVoice(draft: StudioDraft) {
  const source = [draft.traits, draft.manner, draft.role, draft.background]
    .join(' ')
    .toLowerCase()
  const pitch =
    source.includes('systems') || source.includes('terse')
      ? 'low pitch'
      : 'medium-low pitch'
  const pace =
    source.includes('precise') || source.includes('skeptical')
      ? 'measured pace'
      : 'steady pace'
  const warmth =
    source.includes('protective') || source.includes('calm')
      ? 'warm edge'
      : 'cool warmth'
  const energy = source.includes('playful')
    ? 'bright energy'
    : 'contained energy'
  return `${pitch} · ${pace} · ${warmth} · ${energy}`
}

function agentFillDraft(draft: StudioDraft): Partial<StudioDraft> {
  return {
    build: draft.build ?? 'scratch',
    name: draft.name || 'Nyx',
    era: draft.era || 'near-future console myth',
    background:
      draft.background ||
      'A quiet operator presence formed around local tools, traces, and owner approvals.',
    traits: draft.traits || 'observant, protective, dry-witted, careful',
    manner:
      draft.manner ||
      'Plain speech, precise caveats, no theatrical claims, small warmth under pressure.',
    boundaries:
      draft.boundaries ||
      'No impersonation, no unsafe image analysis, no silent persona switching, and no tool action without the proper gate.',
    role: draft.role || 'practical',
    voice: draft.voice || mapDraftToVoice(draft),
  }
}

function Field({
  label,
  defaultValue,
}: {
  label: string
  defaultValue: string
}) {
  return (
    <div className='space-y-2'>
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  )
}

function SectionHeader({
  action,
  description,
  title,
}: {
  action?: ReactNode
  description?: string
  title: string
}) {
  return (
    <div className='mb-3 flex items-end justify-between gap-3 border-b pb-3'>
      <div>
        <h2 className='text-sm font-medium'>{title}</h2>
        {description ? (
          <p className='text-xs text-muted-foreground'>{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}
