import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Save, UserRound } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from './page-header'
import { personas, soulForPersona } from './personas'

export function CharacterPage() {
  return <CharacterListPage />
}

export function CharacterListPage() {
  const [selected, setSelected] = useState(
    personas.find((item) => item.default) ?? personas[0]
  )
  return (
    <>
      <AgentGateHeader title='Character' />
      <Main>
        <p className='mb-6 max-w-2xl text-sm text-muted-foreground'>
          Configure the text identity used by AgentGate chats. Runtime
          permissions remain in ToolGate.
        </p>
        <section className='grid gap-4 md:grid-cols-2'>
          {personas.map((persona) => (
            <button
              key={persona.id}
              type='button'
              className='rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/40'
              onClick={() => setSelected(persona)}
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <h2 className='font-medium'>{persona.name}</h2>
                  <p className='text-xs text-muted-foreground'>
                    {persona.role}
                  </p>
                </div>
                {selected.id === persona.id ? <Badge>Selected</Badge> : null}
              </div>
              <p className='mt-3 text-sm text-muted-foreground'>
                {persona.identity}
              </p>
            </button>
          ))}
        </section>
        <section className='mt-8 rounded-xl border bg-card p-5'>
          <div className='mb-4 flex items-center gap-3'>
            <UserRound className='size-5 text-primary' />
            <div>
              <h2 className='font-medium'>Text character profile</h2>
              <p className='text-xs text-muted-foreground'>
                Current source: AgentGate local profile
              </p>
            </div>
          </div>
          <div className='grid gap-4 md:grid-cols-2'>
            <div className='space-y-2'>
              <Label>Name</Label>
              <Input value={selected.name} readOnly />
            </div>
            <div className='space-y-2'>
              <Label>Role</Label>
              <Input value={selected.role} readOnly />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label>Identity</Label>
              <Textarea
                value={selected.identity}
                readOnly
                className='min-h-24'
              />
            </div>
            <div className='space-y-2 md:col-span-2'>
              <Label>Boundaries</Label>
              <Textarea
                value={selected.boundaries}
                readOnly
                className='min-h-28'
              />
            </div>
          </div>
          <div className='mt-5 flex items-center gap-2 text-xs text-muted-foreground'>
            <Save className='size-3.5' />
            Text-only character editing is available through the AgentGate
            profile contract.
          </div>
        </section>
        <section className='mt-8 rounded-xl border bg-card p-5'>
          <h2 className='font-medium'>SOUL preview</h2>
          <pre className='mt-3 max-h-80 overflow-auto rounded-md bg-muted/40 p-4 text-xs whitespace-pre-wrap text-muted-foreground'>
            {soulForPersona(selected)}
          </pre>
        </section>
      </Main>
    </>
  )
}

export function CharacterDetailPage({ personaId }: { personaId: string }) {
  const persona = personas.find((item) => item.id === personaId)
  if (!persona) {
    return (
      <>
        <AgentGateHeader title='Character unavailable' />
        <Main>
          <p className='text-sm text-muted-foreground'>
            This text character is not available from the local profile source.
          </p>
          <Button asChild className='mt-4'>
            <Link to='/character'>Back to characters</Link>
          </Button>
        </Main>
      </>
    )
  }
  return (
    <>
      <AgentGateHeader
        title={persona.name}
        eyebrow='Text character'
        leftExtra={<Badge variant='outline'>{persona.role}</Badge>}
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
            <pre className='mt-3 max-h-96 overflow-auto rounded-md bg-card p-4 text-xs whitespace-pre-wrap text-muted-foreground'>
              {soulForPersona(persona)}
            </pre>
          </section>
        </div>
      </Main>
    </>
  )
}
