import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from './page-header'

type DomainShellProps = {
  title: string
  eyebrow: string
  status: 'planned' | 'blocked' | 'empty' | 'unknown'
  purpose: string
  source: string
  next: ReactNode
}

export function DomainShell({
  title,
  eyebrow,
  status,
  purpose,
  source,
  next,
}: DomainShellProps) {
  return (
    <>
      <AgentGateHeader title={title} eyebrow={eyebrow} />
      <Main>
        <section className='grid w-full gap-4 xl:grid-cols-[minmax(0,1fr)_380px]'>
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-2 border-b pb-4'>
              <h2 className='text-lg font-medium'>{title}</h2>
              <Badge variant='outline'>{status}</Badge>
            </div>
            <div className='rounded-lg border p-4'>
              <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                What this screen is for
              </p>
              <p className='mt-2 text-sm leading-6 text-muted-foreground'>
                {purpose}
              </p>
            </div>
            <div className='rounded-lg border p-4'>
              <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
                Source of truth
              </p>
              <p className='mt-2 text-sm leading-6 text-foreground'>{source}</p>
            </div>
          </div>

          <aside className='rounded-lg border bg-muted/20 p-4'>
            <p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
              Next useful slice
            </p>
            <div className='mt-2 text-sm leading-6 text-muted-foreground'>
              {next}
            </div>
            <Button asChild variant='outline' className='mt-4'>
              <Link to='/chats'>Ask in chat</Link>
            </Button>
          </aside>
        </section>
      </Main>
    </>
  )
}
