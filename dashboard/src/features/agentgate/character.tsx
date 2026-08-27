import { type DragEvent, type FormEvent, useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Save, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Main } from '@/components/layout/main'
import { getCharacterProfile, putAgentGate, type CharacterProfile } from './api'
import { AgentGateHeader } from './page-header'
import { personas, soulForPersona } from './personas'

type CharacterForm = {
  name: string
  mode: string
  primary_model: string
  fallback_model: string
  personality: string
  background: string
  boundaries: string
  allowed_tools: string
  allowed_skills: string
  avatar_label: string
  emotion_pack: string
}

const emptyForm: CharacterForm = {
  name: '',
  mode: 'companion',
  primary_model: '',
  fallback_model: '',
  personality: '',
  background: '',
  boundaries:
    'Tool permissions, external effects, secrets, and system actions remain controlled by ToolGate and owner approvals.',
  allowed_tools: '',
  allowed_skills: '',
  avatar_label: '',
  emotion_pack: 'none',
}

function formFromProfile(profile?: CharacterProfile): CharacterForm {
  return {
    ...emptyForm,
    name: profile?.name ?? '',
    mode: profile?.mode || 'companion',
    primary_model: profile?.primary_model ?? '',
    fallback_model: profile?.fallback_model ?? '',
    personality: profile?.personality ?? '',
    background: profile?.background ?? '',
    boundaries: profile?.boundaries || emptyForm.boundaries,
    allowed_tools: profile?.allowed_tools ?? '',
    allowed_skills: profile?.allowed_skills ?? '',
    avatar_label: profile?.avatar_label ?? '',
    emotion_pack: profile?.emotion_pack || 'none',
  }
}

export function CharacterPage() {
  return <CharacterListPage />
}

export function CharacterListPage() {
  const queryClient = useQueryClient()
  const profile = useQuery({
    queryKey: ['agentgate', 'character'],
    queryFn: getCharacterProfile,
    retry: false,
  })
  const [form, setForm] = useState<CharacterForm>(emptyForm)
  const [savedMessage, setSavedMessage] = useState('')

  useEffect(() => {
    if (!profile.data) return
    queueMicrotask(() => setForm(formFromProfile(profile.data)))
  }, [profile.data])

  const save = useMutation({
    mutationFn: () =>
      putAgentGate('/api/character', {
        name: form.name,
        owner_name: '',
        personality: form.personality,
        background: form.background,
        boundaries: form.boundaries,
        mode: form.mode,
        primary_model: form.primary_model,
        fallback_model: form.fallback_model,
        allowed_tools: form.allowed_tools,
        allowed_skills: form.allowed_skills,
        avatar_label: form.avatar_label,
        emotion_pack: form.emotion_pack,
      }),
    onSuccess: async () => {
      setSavedMessage(
        'Character configuration saved from AgentGate local profile.'
      )
      await queryClient.invalidateQueries({
        queryKey: ['agentgate', 'character'],
      })
    },
  })

  function update<K extends keyof CharacterForm>(
    key: K,
    value: CharacterForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.name.trim()) save.mutate()
  }

  function handleAvatarDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) update('avatar_label', file.name)
  }

  function handleAvatarPick(files: FileList | null) {
    const file = files?.[0]
    if (file) update('avatar_label', file.name)
  }

  return (
    <>
      <AgentGateHeader title='Character' eyebrow='Agent Studio' />
      <Main>
        <div className='mb-6 w-full space-y-2'>
          <p className='text-sm text-muted-foreground'>
            Create the main companion yourself. No default Conker, no forced
            template cards. This form asks for the model route, fallback model,
            allowed tools, allowed skills, avatar, and emotion pack while
            ToolGate still owns real permissions.
          </p>
          <div className='flex flex-wrap gap-2 text-xs'>
            <Badge variant={profile.data?.configured ? 'default' : 'outline'}>
              {profile.data?.configured ? 'configured' : 'setup needed'}
            </Badge>
            <Badge variant='outline'>source: AgentGate local profile</Badge>
          </div>
        </div>

        <form className='w-full space-y-8' onSubmit={submit}>
          <section className='space-y-4'>
            <h2 className='text-base font-medium'>Identity</h2>
            <div className='grid gap-4 md:grid-cols-2'>
              <Field label='Companion name' htmlFor='character-name'>
                <Input
                  id='character-name'
                  value={form.name}
                  onChange={(event) => update('name', event.target.value)}
                  placeholder='Pick a name'
                  required
                />
              </Field>
              <Field label='Mode' htmlFor='character-mode'>
                <select
                  id='character-mode'
                  className='h-9 rounded-md border bg-background px-3 text-sm'
                  value={form.mode}
                  onChange={(event) => update('mode', event.target.value)}
                >
                  <option value='companion'>Main companion</option>
                  <option value='worker'>Worker</option>
                  <option value='research'>Research agent</option>
                  <option value='systems'>Systems agent</option>
                  <option value='creative'>Creative agent</option>
                </select>
              </Field>
              <Field
                label='Identity / personality'
                htmlFor='character-personality'
                className='md:col-span-2'
              >
                <Textarea
                  id='character-personality'
                  value={form.personality}
                  onChange={(event) =>
                    update('personality', event.target.value)
                  }
                  placeholder='How should this agent think, speak, and help?'
                  className='min-h-24'
                />
              </Field>
              <Field
                label='Background / purpose'
                htmlFor='character-background'
                className='md:col-span-2'
              >
                <Textarea
                  id='character-background'
                  value={form.background}
                  onChange={(event) => update('background', event.target.value)}
                  placeholder='What is this agent for?'
                  className='min-h-20'
                />
              </Field>
              <Field
                label='Boundaries'
                htmlFor='character-boundaries'
                className='md:col-span-2'
              >
                <Textarea
                  id='character-boundaries'
                  value={form.boundaries}
                  onChange={(event) => update('boundaries', event.target.value)}
                  className='min-h-24'
                />
              </Field>
            </div>
          </section>

          <section className='space-y-4 border-t pt-6'>
            <h2 className='text-base font-medium'>Models and fallback</h2>
            <div className='grid gap-4 md:grid-cols-2'>
              <Field label='Primary model' htmlFor='primary-model'>
                <Input
                  id='primary-model'
                  value={form.primary_model}
                  onChange={(event) =>
                    update('primary_model', event.target.value)
                  }
                  placeholder='provider/model or source default'
                />
              </Field>
              <Field label='Fallback model' htmlFor='fallback-model'>
                <Input
                  id='fallback-model'
                  value={form.fallback_model}
                  onChange={(event) =>
                    update('fallback_model', event.target.value)
                  }
                  placeholder='optional fallback provider/model'
                />
              </Field>
            </div>
          </section>

          <section className='space-y-4 border-t pt-6'>
            <h2 className='text-base font-medium'>Allowed capabilities</h2>
            <div className='grid gap-4 md:grid-cols-2'>
              <Field label='Tools to allow' htmlFor='allowed-tools'>
                <Textarea
                  id='allowed-tools'
                  value={form.allowed_tools}
                  onChange={(event) =>
                    update('allowed_tools', event.target.value)
                  }
                  placeholder='memory.search, web.search, toolgate.run ...'
                  className='min-h-24'
                />
              </Field>
              <Field label='Skills to allow' htmlFor='allowed-skills'>
                <Textarea
                  id='allowed-skills'
                  value={form.allowed_skills}
                  onChange={(event) =>
                    update('allowed_skills', event.target.value)
                  }
                  placeholder='research, coding, planning ...'
                  className='min-h-24'
                />
              </Field>
            </div>
          </section>

          <section className='space-y-4 border-t pt-6'>
            <h2 className='text-base font-medium'>Avatar and emotions</h2>
            <div className='grid gap-4 md:grid-cols-2'>
              <Field label='Avatar photo' htmlFor='avatar-photo'>
                <label
                  htmlFor='avatar-photo'
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={handleAvatarDrop}
                  className='flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed bg-muted/20 px-4 text-center text-sm text-muted-foreground'
                >
                  <Upload className='size-5' />
                  {form.avatar_label || 'Drop a photo here or click to choose'}
                </label>
                <Input
                  id='avatar-photo'
                  type='file'
                  accept='image/*'
                  className='sr-only'
                  onChange={(event) => handleAvatarPick(event.target.files)}
                />
              </Field>
              <Field label='Emotion pack' htmlFor='emotion-pack'>
                <select
                  id='emotion-pack'
                  className='h-9 rounded-md border bg-background px-3 text-sm'
                  value={form.emotion_pack}
                  onChange={(event) =>
                    update('emotion_pack', event.target.value)
                  }
                >
                  <option value='none'>None yet</option>
                  <option value='owner-basic'>
                    Owner basic: neutral, focused, happy, annoyed
                  </option>
                  <option value='uploaded-pack'>Uploaded pack</option>
                  <option value='single-avatar'>Single avatar only</option>
                </select>
                <p className='text-xs text-muted-foreground'>
                  Image bytes are not sent to the browser API yet; the current
                  source-bound field stores the chosen filename/pack label only.
                </p>
              </Field>
            </div>
          </section>

          <div className='flex flex-wrap items-center gap-3 border-t pt-6'>
            <Button
              type='submit'
              disabled={save.isPending || !form.name.trim()}
            >
              <Save className='mr-2 size-4' />
              Save agent configuration
            </Button>
            {save.error ? (
              <span className='text-sm text-destructive'>
                {save.error instanceof Error
                  ? save.error.message
                  : 'Save failed'}
              </span>
            ) : savedMessage ? (
              <span className='text-sm text-muted-foreground'>
                {savedMessage}
              </span>
            ) : null}
          </div>
        </form>
      </Main>
    </>
  )
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={`grid gap-2 ${className ?? ''}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

export function CharacterDetailPage({ personaId }: { personaId: string }) {
  const persona = personas.find((item) => item.id === personaId)
  if (!persona) {
    return (
      <>
        <AgentGateHeader title='Agent unavailable' />
        <Main>
          <p className='text-sm text-muted-foreground'>
            This metadata record is not available from the local profile source.
          </p>
          <Button asChild className='mt-4'>
            <Link to='/character'>Back to Agent Studio</Link>
          </Button>
        </Main>
      </>
    )
  }
  return (
    <>
      <AgentGateHeader
        title={persona.name}
        eyebrow='Optional preset metadata'
      />
      <Main>
        <div className='mb-4'>
          <Button asChild variant='ghost' size='sm'>
            <Link to='/character'>
              <ArrowLeft className='mr-2 size-4' />
              Back
            </Link>
          </Button>
        </div>
        <div className='space-y-6'>
          <section>
            <h2 className='font-medium'>Identity</h2>
            <p className='mt-2 text-sm text-muted-foreground'>
              {persona.identity}
            </p>
          </section>
          <section>
            <h2 className='font-medium'>Boundaries</h2>
            <p className='mt-2 text-sm whitespace-pre-wrap text-muted-foreground'>
              {persona.boundaries}
            </p>
          </section>
          <section>
            <h2 className='font-medium'>SOUL preview</h2>
            <pre className='mt-3 max-h-96 overflow-auto rounded-md bg-muted/40 p-4 text-xs whitespace-pre-wrap text-muted-foreground'>
              {soulForPersona(persona)}
            </pre>
          </section>
        </div>
      </Main>
    </>
  )
}
