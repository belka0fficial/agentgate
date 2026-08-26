import { useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { getAgentGate, relativeTime } from './api'
import { AgentGateHeader } from './page-header'

type MemoryRecord = {
  id: string
  title: string
  kind: string
  confidence: string
  updated_at: string
}
const kinds = [
  'all',
  'policy',
  'preference',
  'operational',
  'research',
  'project',
  'runbook',
]

export function MemoryPage() {
  const [kind, setKind] = useState('all')
  const [sort, setSort] = useState('confidence')
  const [selectedId, setSelectedId] = useState('mem_001')
  const query = useQuery({
    queryKey: ['agentgate', 'memory'],
    queryFn: () =>
      getAgentGate<{ memories: MemoryRecord[] }>('/api/gates/memorygate'),
  })
  const records = useMemo(
    () =>
      (query.data?.memories ?? [])
        .filter((item) => kind === 'all' || item.kind === kind)
        .sort((a, b) =>
          sort === 'date'
            ? +new Date(b.updated_at) - +new Date(a.updated_at)
            : rank(b.confidence) - rank(a.confidence)
        ),
    [query.data, kind, sort]
  )
  const selected =
    (query.data?.memories ?? []).find((item) => item.id === selectedId) ??
    records[0]

  return (
    <>
      <AgentGateHeader
        actions={
          <MemoryToolbar
            kind={kind}
            sort={sort}
            onKindChange={setKind}
            onSortChange={setSort}
          />
        }
      />
      <Main>
        <p className='mb-6 text-sm text-muted-foreground'>
          Durable context, evidence, and operational knowledge retained by
          MemoryGate.
        </p>
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
          <section>
            <div className='mb-4 border-b pb-3'>
              <h2 className='text-sm font-medium'>Stored context</h2>
              <p className='text-xs text-muted-foreground'>
                Evidence-backed memories available to the agent when relevant.
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Memory</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((item) => (
                  <TableRow
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'cursor-pointer',
                      selected?.id === item.id && 'bg-muted/50'
                    )}
                  >
                    <TableCell>
                      <p className='font-medium'>{item.title}</p>
                      <code className='font-mono text-xs text-muted-foreground'>
                        {item.id}
                      </code>
                    </TableCell>
                    <TableCell>
                      <Badge variant='outline'>{item.kind}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.confidence === 'high' ? 'secondary' : 'outline'
                        }
                      >
                        {item.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <code className='font-mono text-xs'>
                        {relativeTime(item.updated_at)}
                      </code>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
          <MemoryDetail memory={selected} />
        </div>
      </Main>
    </>
  )
}

function MemoryToolbar({
  kind,
  sort,
  onKindChange,
  onSortChange,
}: {
  kind: string
  sort: string
  onKindChange: (value: string) => void
  onSortChange: (value: string) => void
}) {
  return (
    <>
      <CompactSelect value={kind} onValueChange={onKindChange}>
        {kinds.map((item) => (
          <SelectItem key={item} value={item}>
            {item === 'all' ? 'All kinds' : item}
          </SelectItem>
        ))}
      </CompactSelect>
      <CompactSelect value={sort} onValueChange={onSortChange}>
        <SelectItem value='confidence'>Confidence first</SelectItem>
        <SelectItem value='date'>Newest first</SelectItem>
      </CompactSelect>
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
      <SelectTrigger className='h-8 w-40 border-0 bg-muted/45 px-2 shadow-none'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  )
}

function MemoryDetail({ memory }: { memory?: MemoryRecord }) {
  if (!memory)
    return (
      <Card>
        <CardContent className='py-10 text-center text-sm text-muted-foreground'>
          Select a memory to inspect its evidence.
        </CardContent>
      </Card>
    )
  return (
    <Card className='h-fit xl:sticky xl:top-4'>
      <CardHeader>
        <div className='flex items-center justify-between gap-3'>
          <CardTitle>Evidence detail</CardTitle>
          <Badge variant='secondary'>{memory.confidence}</Badge>
        </div>
        <CardDescription>
          <code className='font-mono'>{memory.id}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-5'>
        <div>
          <p className='mb-1 text-xs font-medium text-muted-foreground'>
            Claim
          </p>
          <p className='text-sm leading-6'>{memory.title}</p>
        </div>
        <div>
          <p className='mb-2 text-xs font-medium text-muted-foreground'>
            Evidence chain
          </p>
          <ol className='space-y-3 border-l pl-4 text-sm'>
            <li>
              <p className='font-medium'>Source observed</p>
              <p className='text-xs text-muted-foreground'>
                Operator policy · signed revision 14
              </p>
            </li>
            <li>
              <p className='font-medium'>Claim extracted</p>
              <p className='text-xs text-muted-foreground'>
                MemoryGate · deterministic parser
              </p>
            </li>
            <li>
              <p className='font-medium'>Verified</p>
              <p className='text-xs text-muted-foreground'>
                Cross-checked against active ToolGate policy
              </p>
            </li>
          </ol>
        </div>
        <div>
          <p className='mb-2 text-xs font-medium text-muted-foreground'>
            Linked entities
          </p>
          <div className='flex flex-wrap gap-2'>
            <Badge variant='outline'>release-0.8</Badge>
            <Badge variant='outline'>ToolGate</Badge>
            <Badge variant='outline'>Owner</Badge>
          </div>
        </div>
        <div className='rounded-md bg-muted p-3'>
          <p className='text-xs text-muted-foreground'>Source</p>
          <code className='mt-1 block font-mono text-xs break-all'>
            policy://repository/external-effects@14
          </code>
        </div>
      </CardContent>
    </Card>
  )
}

function rank(confidence: string) {
  return confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1
}
