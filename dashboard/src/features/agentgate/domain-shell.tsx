import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        <Card className='max-w-3xl'>
          <CardHeader>
            <div className='flex flex-wrap items-center gap-2'>
              <CardTitle>{title}</CardTitle>
              <Badge variant='outline'>{status}</Badge>
            </div>
          </CardHeader>
          <CardContent className='space-y-5 text-sm leading-6 text-muted-foreground'>
            <p>{purpose}</p>
            <div className='rounded-xl border bg-muted/25 p-4'>
              <p className='font-mono text-[11px] tracking-wide text-muted-foreground uppercase'>
                Source of truth
              </p>
              <p className='mt-2 text-foreground'>{source}</p>
            </div>
            <div>{next}</div>
            <Button asChild variant='outline'>
              <Link to='/chats'>Ask Conker about this</Link>
            </Button>
          </CardContent>
        </Card>
      </Main>
    </>
  )
}
