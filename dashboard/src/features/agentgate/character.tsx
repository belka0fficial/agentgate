import {
  cloneElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight, ImagePlus, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { getCharacterProfile, putAgentGate, type CharacterProfile } from './api'

const steps = [
  'Identity',
  'Appearance',
  'Purpose',
  'Behavior',
  'Model',
  'Tools',
  'Skills',
  'Memory',
  'Autonomy',
  'Output',
  'Review',
] as const
type Step = (typeof steps)[number]
type Appearance = Record<string, string>
type AgentForm = {
  name: string
  owner_name: string
  mode: string
  description: string
  personality: string
  background: string
  boundaries: string
  primary_model: string
  fallback_model: string
  allowed_tools: string[]
  allowed_skills: string[]
  avatar_label: string
  emotion_pack: string
  appearance: Appearance
  memory_mode: string
  autonomy_level: string
  output_format: string
  tool_policy: string
  reasoning_level: string
}

const toolCatalog = ['Web', 'Memory', 'Files', 'Browser', 'GitHub', 'Email']
const skillCatalog = [
  'Grounded research',
  'Software development',
  'Code review',
  'Document creation',
  'Systematic debugging',
]
const appearanceFields = [
  'age',
  'gender',
  'pronouns',
  'species',
  'build',
  'height',
  'hair',
  'eyes',
]
const emptyForm: AgentForm = {
  name: '',
  owner_name: '',
  mode: 'companion',
  description: '',
  personality: '',
  background: '',
  boundaries:
    'Tool permissions, secrets, external effects, and system actions remain controlled by ToolGate and owner approvals.',
  primary_model: '',
  fallback_model: '',
  allowed_tools: ['Web', 'Memory', 'Files'],
  allowed_skills: [],
  avatar_label: '',
  emotion_pack: 'none',
  appearance: {},
  memory_mode: 'unknown',
  autonomy_level: 'unknown',
  output_format: 'unknown',
  tool_policy: 'unknown',
  reasoning_level: 'unknown',
}

function formFromProfile(profile?: CharacterProfile): AgentForm {
  return {
    ...emptyForm,
    name: profile?.name ?? '',
    owner_name: profile?.owner_name ?? '',
    mode: profile?.mode || 'companion',
    personality: profile?.personality ?? '',
    background: profile?.background ?? '',
    description: profile?.description ?? '',
    boundaries: profile?.boundaries || emptyForm.boundaries,
    primary_model: profile?.primary_model ?? '',
    fallback_model: profile?.fallback_model ?? '',
    allowed_tools: splitList(profile?.allowed_tools),
    allowed_skills: splitList(profile?.allowed_skills),
    avatar_label: profile?.avatar_label ?? '',
    emotion_pack: profile?.emotion_pack || 'none',
    appearance: profile?.appearance ?? {},
    memory_mode: profile?.memory_mode || 'unknown',
    autonomy_level: profile?.autonomy_level || 'unknown',
    output_format: profile?.output_format || 'unknown',
    tool_policy: profile?.tool_policy || 'unknown',
    reasoning_level: profile?.reasoning_level || 'unknown',
  }
}
function splitList(value?: string) {
  return value
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : []
}

export function CharacterPage() {
  return <AgentStudio />
}
export function CharacterListPage() {
  return <AgentStudio />
}

export function CharacterDetailPage(props: { personaId: string }) {
  void props
  return <AgentStudio />
}

export function AgentStudio() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const profile = useQuery({
    queryKey: ['agentgate', 'character'],
    queryFn: getCharacterProfile,
    retry: false,
  })
  const [current, setCurrent] = useState<Step>('Identity')
  const [form, setForm] = useState<AgentForm>(emptyForm)
  const [imagePreview, setImagePreview] = useState('')
  const [search, setSearch] = useState('')
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (profile.data)
      queueMicrotask(() => setForm(formFromProfile(profile.data)))
  }, [profile.data])
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview)
    }
  }, [imagePreview])
  const save = useMutation({
    mutationFn: () =>
      putAgentGate('/api/character', {
        ...form,
        allowed_tools: form.allowed_tools.join(', '),
        allowed_skills: form.allowed_skills.join(', '),
        appearance: form.appearance,
        avatar_label: form.avatar_label,
        emotion_pack: form.emotion_pack,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['agentgate', 'character'],
      })
      setConfirming(false)
      void navigate({ to: '/companion' })
    },
  })
  const filteredTools = useMemo(
    () =>
      toolCatalog.filter((item) =>
        item.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )
  const filteredSkills = useMemo(
    () =>
      skillCatalog.filter((item) =>
        item.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  )
  const index = steps.indexOf(current)
  const update = <K extends keyof AgentForm>(key: K, value: AgentForm[K]) =>
    setForm((old) => ({ ...old, [key]: value }))
  const toggle = (key: 'allowed_tools' | 'allowed_skills', value: string) =>
    update(
      key,
      form[key].includes(value)
        ? form[key].filter((item) => item !== value)
        : [...form[key], value]
    )
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      setCurrent('Identity')
      return
    }
    if (current !== 'Review') setCurrent('Review')
    else if (!confirming) setConfirming(true)
    else save.mutate()
  }
  const selectImage = (file?: File) => {
    if (!file) return
    update('avatar_label', file.name)
    setImagePreview(URL.createObjectURL(file))
  }

  return (
    <main className='flex min-h-svh flex-col bg-background text-foreground'>
      <header className='flex h-16 shrink-0 items-center justify-between border-b px-6'>
        <div>
          <p className='text-sm font-semibold'>Agent Studio</p>
          <p className='text-xs text-muted-foreground'>
            {profile.data?.configured ? 'Edit Agent' : 'Create Agent'} ·{' '}
            {form.name || 'Draft'}
          </p>
        </div>
        <span className='rounded-full border px-2.5 py-1 text-[11px] text-muted-foreground'>
          {confirming ? 'Confirm changes' : 'Draft · unsaved'}
        </span>
      </header>
      <div className='flex min-h-0 flex-1 flex-col lg:grid lg:grid-cols-[220px_minmax(0,1fr)_410px]'>
        <nav
          aria-label='Agent Studio steps'
          className='border-b px-4 py-3 lg:border-r lg:border-b-0 lg:px-5 lg:py-7'
        >
          <ol className='flex gap-1 overflow-x-auto lg:grid lg:gap-1'>
            {steps.map((step, i) => (
              <li key={step} className='shrink-0'>
                <button
                  type='button'
                  aria-current={step === current ? 'step' : undefined}
                  onClick={() => setCurrent(step)}
                  className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm ${step === current ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/50'}`}
                >
                  <span className='flex size-6 items-center justify-center rounded-full border text-[10px]'>
                    {i < index ? <Check className='size-3' /> : i + 1}
                  </span>
                  <span>{step}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <form
          className='min-w-0 overflow-y-auto px-6 py-8 sm:px-10 lg:px-14 lg:py-10'
          onSubmit={submit}
        >
          <div className='mx-auto max-w-3xl'>
            <StepScreen
              current={current}
              form={form}
              update={update}
              toggle={toggle}
              search={search}
              setSearch={setSearch}
              filteredTools={filteredTools}
              filteredSkills={filteredSkills}
              selectImage={selectImage}
              confirming={confirming}
              setConfirming={setConfirming}
            />
            <div className='mt-12 flex items-center justify-between border-t pt-5'>
              <Button
                type='button'
                variant='ghost'
                disabled={index === 0}
                onClick={() => setCurrent(steps[index - 1])}
              >
                <ChevronLeft className='mr-1 size-4' />
                Back
              </Button>
              <div className='flex gap-2'>
                <Button
                  type='submit'
                  disabled={save.isPending || !form.name.trim()}
                >
                  {current === 'Review' ? (
                    <>
                      <Save className='mr-2 size-4' />
                      Save Agent
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className='ml-1 size-4' />
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
        <Preview form={form} imagePreview={imagePreview} />
      </div>
    </main>
  )
}

function StepScreen({
  current,
  form,
  update,
  toggle,
  search,
  setSearch,
  filteredTools,
  filteredSkills,
  selectImage,
  confirming,
  setConfirming,
}: {
  current: Step
  form: AgentForm
  update: <K extends keyof AgentForm>(key: K, value: AgentForm[K]) => void
  toggle: (key: 'allowed_tools' | 'allowed_skills', value: string) => void
  search: string
  setSearch: (value: string) => void
  filteredTools: string[]
  filteredSkills: string[]
  selectImage: (file?: File) => void
  confirming: boolean
  setConfirming: (value: boolean) => void
}) {
  if (current === 'Identity')
    return (
      <Screen title='Identity'>
        <div className='grid gap-5 sm:grid-cols-2'>
          <Field label='Agent name'>
            <Input
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              required
            />
          </Field>
          <Field label='Agent type'>
            <select
              className='h-10 rounded-md border bg-background px-3 text-sm'
              value={form.mode}
              onChange={(e) => update('mode', e.target.value)}
            >
              <option value='companion'>Companion</option>
              <option value='specialist'>Specialist Agent</option>
              <option value='worker'>Worker</option>
              <option value='operator'>Operator</option>
            </select>
          </Field>
          <Field label='Description' full>
            <Textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              className='min-h-28'
            />
          </Field>
        </div>
      </Screen>
    )
  if (current === 'Appearance')
    return (
      <Screen title='Appearance'>
        <div className='space-y-10'>
          <div className='grid gap-2'>
            <Label htmlFor='agent-profile-image'>Main 2D profile picture</Label>
            <label
              htmlFor='agent-profile-image'
              className='flex aspect-square max-w-sm cursor-pointer items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground'
            >
              <span>
                <ImagePlus className='mx-auto mb-3 size-6' />
                Choose a square image
              </span>
            </label>
            <Input
              id='agent-profile-image'
              type='file'
              className='sr-only'
              accept='image/*'
              onChange={(e) => selectImage(e.target.files?.[0])}
            />
          </div>
          <div>
            <h3 className='mb-4 text-base font-medium'>Appearance details</h3>
            <div className='grid gap-5 sm:grid-cols-2'>
              {appearanceFields.map((key) => (
                <Field key={key} label={key[0].toUpperCase() + key.slice(1)}>
                  <Input
                    placeholder='Unknown'
                    value={form.appearance[key] ?? ''}
                    onChange={(e) =>
                      update('appearance', {
                        ...form.appearance,
                        [key]: e.target.value,
                      })
                    }
                  />
                </Field>
              ))}
            </div>
          </div>
          <div>
            <h3 className='mb-4 text-base font-medium'>Emotion pictures</h3>
            <div className='grid grid-cols-3 gap-3 sm:grid-cols-5'>
              {['Neutral', 'Happy', 'Thinking', 'Annoyed', 'Tired'].map(
                (label) => (
                  <div
                    key={label}
                    className='flex aspect-square items-center justify-center rounded-lg border text-center text-xs text-muted-foreground'
                  >
                    <span className='text-2xl'>?</span>
                    <span className='sr-only'>{label} unknown</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </Screen>
    )
  if (current === 'Purpose')
    return (
      <Screen title='Purpose and role'>
        <Field label='What is this Agent responsible for?'>
          <Textarea
            value={form.background}
            onChange={(e) => update('background', e.target.value)}
            className='min-h-36'
          />
        </Field>
      </Screen>
    )
  if (current === 'Behavior')
    return (
      <Screen title='Behavior and personality'>
        <div className='space-y-5'>
          <Field label='How should this Agent behave?'>
            <Textarea
              value={form.personality}
              onChange={(e) => update('personality', e.target.value)}
              className='min-h-36'
            />
          </Field>
          <Field label='Boundaries'>
            <Textarea
              value={form.boundaries}
              onChange={(e) => update('boundaries', e.target.value)}
              className='min-h-28'
            />
          </Field>
        </div>
      </Screen>
    )
  if (current === 'Model')
    return (
      <Screen title='Model route'>
        <div className='grid gap-5 sm:grid-cols-2'>
          <Field label='Provider'>
            <Input
              value={form.primary_model.split('/')[0] ?? ''}
              onChange={(e) => update('primary_model', `${e.target.value}/`)}
              placeholder='Source provider'
            />
          </Field>
          <Field label='Primary model'>
            <Input
              value={form.primary_model.split('/').slice(1).join('/')}
              onChange={(e) =>
                update(
                  'primary_model',
                  `${form.primary_model.split('/')[0] || 'source'}/${e.target.value}`
                )
              }
              placeholder='Source model'
            />
          </Field>
          <Field label='Fallback model'>
            <Input
              value={form.fallback_model}
              onChange={(e) => update('fallback_model', e.target.value)}
              placeholder='Optional'
            />
          </Field>
          <Field label='Reasoning'>
            <select
              className='h-10 rounded-md border bg-background px-3 text-sm'
              value={form.reasoning_level}
              onChange={(e) => update('reasoning_level', e.target.value)}
            >
              <option value='unknown'>Model default</option>
              <option value='high'>High</option>
              <option value='medium'>Medium</option>
              <option value='low'>Low</option>
            </select>
          </Field>
        </div>
      </Screen>
    )
  if (current === 'Tools' || current === 'Skills') {
    const isTools = current === 'Tools'
    const items = isTools ? filteredTools : filteredSkills
    const key = isTools ? 'allowed_tools' : 'allowed_skills'
    return (
      <Screen
        title={
          isTools
            ? 'Which Tools may this Agent request?'
            : 'Which Skills should this Agent know?'
        }
      >
        <div className='max-w-2xl'>
          <Input
            placeholder={`Search ${current}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={`Search ${current}`}
          />
          <div className='mt-3 divide-y rounded-lg border'>
            {items.map((item) => (
              <label
                key={item}
                className='flex cursor-pointer items-center justify-between px-4 py-4'
              >
                <span className='text-sm font-medium'>{item}</span>
                <input
                  type='checkbox'
                  className='size-4'
                  checked={form[key].includes(item)}
                  onChange={() => toggle(key, item)}
                />
              </label>
            ))}
          </div>
        </div>
      </Screen>
    )
  }
  if (current === 'Memory')
    return (
      <Screen title='Memory access'>
        <Choices
          value={form.memory_mode}
          options={['unknown', 'read-only', 'reviewed writes', 'off']}
          onChange={(value) => update('memory_mode', value)}
        />
      </Screen>
    )
  if (current === 'Autonomy')
    return (
      <Screen title='Autonomy and limits'>
        <Choices
          value={form.autonomy_level}
          options={['unknown', 'advisory', 'supervised', 'approval-gated']}
          onChange={(value) => update('autonomy_level', value)}
        />
      </Screen>
    )
  if (current === 'Output')
    return (
      <Screen title='Output'>
        <Choices
          value={form.output_format}
          options={['unknown', 'Markdown', 'Plain text', 'Structured JSON']}
          onChange={(value) => update('output_format', value)}
        />
      </Screen>
    )
  return (
    <Screen title='Review Agent'>
      <div className='rounded-lg border p-5'>
        <h3 className='font-medium'>
          {confirming ? 'Save this Agent?' : 'Ready to review'}
        </h3>
        <p className='mt-2 text-sm text-muted-foreground'>
          {confirming
            ? 'The preview on the right is the exact Agent definition that will be saved.'
            : 'Check the complete preview on the right. You can return to any step before saving.'}
        </p>
        {confirming ? (
          <Button
            type='button'
            className='mt-4'
            variant='outline'
            onClick={() => setConfirming(false)}
          >
            Back to edit
          </Button>
        ) : (
          <Button
            type='button'
            className='mt-4'
            onClick={() => setConfirming(true)}
          >
            Show save confirmation
          </Button>
        )}
      </div>
    </Screen>
  )
}

function Screen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className='mb-8 text-3xl font-semibold tracking-[-0.04em]'>
        {title}
      </h2>
      {children}
    </section>
  )
}
function Field({
  label,
  children,
  full,
}: {
  label: string
  children: ReactNode
  full?: boolean
}) {
  const id = `agent-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
  const labelledChild = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string }>, {
        id: (children.props as { id?: string }).id ?? id,
      })
    : children
  return (
    <div className={`grid gap-2 ${full ? 'sm:col-span-2' : ''}`}>
      <Label htmlFor={id}>{label}</Label>
      {labelledChild}
    </div>
  )
}
function Choices({
  value,
  options,
  onChange,
}: {
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <div className='grid max-w-2xl gap-3'>
      {options.map((option) => (
        <button
          type='button'
          key={option}
          onClick={() => onChange(option)}
          className={`rounded-lg border p-4 text-left text-sm ${value === option ? 'border-foreground bg-muted' : 'hover:bg-muted/50'}`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
function Preview({
  form,
  imagePreview,
}: {
  form: AgentForm
  imagePreview: string
}) {
  const value = (key: string) => form.appearance[key] || 'Unknown'
  return (
    <aside className='border-t p-5 lg:border-t-0 lg:border-l lg:p-6'>
      <div className='sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto'>
        <h2 className='text-2xl font-semibold tracking-[-0.04em]'>
          {form.name || 'Unnamed Agent'}
        </h2>
        <p className='mt-1 text-xs text-muted-foreground'>
          {form.mode} · draft · unsaved changes
        </p>
        <div className='mt-4 aspect-square w-full bg-black'>
          {imagePreview ? (
            <img
              src={imagePreview}
              alt='Agent draft profile'
              className='size-full object-contain'
            />
          ) : (
            <span className='grid size-full place-items-center text-6xl text-neutral-600'>
              ?
            </span>
          )}
        </div>
        <div className='flex gap-2 border-b py-3'>
          {['Neutral', 'Happy', 'Thinking', 'Annoyed', 'Tired'].map((label) => (
            <div
              key={label}
              className='grid size-8 place-items-center rounded-xl border bg-black text-xs text-neutral-500'
              title={`${label} image unknown`}
            >
              ?
            </div>
          ))}
        </div>
        <p className='py-4 text-sm leading-6 text-muted-foreground'>
          {form.description || 'No description yet.'}
        </p>
        <div className='flex flex-wrap gap-1.5'>
          {[
            form.primary_model || 'Model unknown',
            ...form.allowed_tools,
            `${form.allowed_skills.length} Skills`,
            form.memory_mode,
            form.autonomy_level,
          ].map((item) => (
            <span
              key={item}
              className='rounded-full border px-2 py-1 text-[10px] text-muted-foreground'
            >
              {item}
            </span>
          ))}
        </div>
        <div className='mt-5 border-t pt-4'>
          <p className='mb-3 text-[10px] tracking-[.16em] text-muted-foreground uppercase'>
            Appearance
          </p>
          <dl className='grid grid-cols-[90px_1fr] gap-2 text-xs'>
            <dt className='text-muted-foreground'>Age</dt>
            <dd>{value('age')}</dd>
            <dt className='text-muted-foreground'>Gender</dt>
            <dd>{value('gender')}</dd>
            <dt className='text-muted-foreground'>Pronouns</dt>
            <dd>{value('pronouns')}</dd>
            <dt className='text-muted-foreground'>Species</dt>
            <dd>{value('species')}</dd>
            <dt className='text-muted-foreground'>Build</dt>
            <dd>{value('build')}</dd>
          </dl>
        </div>
        <div className='mt-5 border-t pt-4'>
          <p className='mb-3 text-[10px] tracking-[.16em] text-muted-foreground uppercase'>
            Operation
          </p>
          <dl className='grid grid-cols-[90px_1fr] gap-2 text-xs'>
            <dt className='text-muted-foreground'>Tools</dt>
            <dd>
              {form.allowed_tools.length} enabled · {form.tool_policy}
            </dd>
            <dt className='text-muted-foreground'>Memory</dt>
            <dd>{form.memory_mode}</dd>
            <dt className='text-muted-foreground'>Autonomy</dt>
            <dd>{form.autonomy_level}</dd>
          </dl>
        </div>
      </div>
    </aside>
  )
}
