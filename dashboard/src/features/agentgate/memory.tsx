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
import {
  buildMemoryDetail,
  memoryOverviewErrors,
  memoryOverviewState,
  memorySectionSummaries,
  normalizeMemoryRecords,
  type MemoryRecord,
  type MemoryState,
} from './memory-overview'
import { AgentGateHeader } from './page-header'

const kinds = [
  'all',
  'policy',
  'preference',
  'operational',
  'research',
  'project',
  'runbook',
  'pattern',
  'unknown',
]

function stateVariant(state: MemoryState) {
  if (state === 'fact') return 'secondary'
  if (state === 'pattern' || state === 'theory') return 'outline'
  return 'outline'
}

export function MemoryPage() {
  const [kind, setKind] = useState('all')
  const [sort, setSort] = useState('confidence')
  const [selectedId, setSelectedId] = useState('')
  const query = useQuery({
    queryKey: ['agentgate', 'memory'],
    queryFn: () => getAgentGate<unknown>('/api/gates/memorygate'),
  })
  const allRecords = useMemo(
    () => normalizeMemoryRecords(query.data),
    [query.data]
  )
  const memoryErrors = useMemo(
    () => memoryOverviewErrors(query.data),
    [query.data]
  )
  const sectionSummaries = useMemo(
    () => memorySectionSummaries(query.data),
    [query.data]
  )
  const records = useMemo(
    () =>
      allRecords
        .filter(
          (item) => kind === 'all' || item.kind === kind || item.state === kind
        )
        .sort((a, b) =>
          sort === 'date'
            ? +new Date(b.updated_at ?? 0) - +new Date(a.updated_at ?? 0)
            : rank(b.confidence) - rank(a.confidence)
        ),
    [allRecords, kind, sort]
  )
  const selected =
    allRecords.find((item) => item.id === selectedId) ?? records[0]
  const sourceState = query.isLoading
    ? 'unknown'
    : memoryOverviewState(query.data, allRecords)

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
          MemoryGate. Facts, theories, patterns, empty, and unknown states stay
          distinct.
        </p>
        {query.error || memoryErrors.length ? (
          <div className='mb-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive'>
            MemoryGate overview degraded:{' '}
            {query.error?.message ?? memoryErrors.join('; ')}
          </div>
        ) : null}
        <div className='mb-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6'>
          {sectionSummaries.map((section) => (
            <Card key={section.id}>
              <CardHeader className='space-y-2 pb-2'>
                <div className='flex items-start justify-between gap-2'>
                  <CardTitle className='text-sm'>{section.title}</CardTitle>
                  <Badge
                    variant={
                      section.status === 'live'
                        ? 'secondary'
                        : section.status === 'degraded' ||
                            section.status === 'offline' ||
                            section.status === 'blocked'
                          ? 'destructive'
                          : 'outline'
                    }
                  >
                    {section.status}
                  </Badge>
                </div>
                <CardDescription>{section.source}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className='text-2xl font-semibold'>{section.count}</p>
                <p className='mt-1 text-xs leading-5 text-muted-foreground'>
                  {section.detail}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]'>
          <section>
            <div className='mb-4 flex items-end justify-between gap-3 border-b pb-3'>
              <div>
                <h2 className='text-sm font-medium'>Stored context</h2>
                <p className='text-xs text-muted-foreground'>
                  Records shown only when returned by MemoryGate overview/search
                  metadata contracts.
                </p>
              </div>
              <Badge
                variant={
                  sourceState === 'live'
                    ? 'secondary'
                    : sourceState === 'degraded'
                      ? 'destructive'
                      : 'outline'
                }
              >
                {sourceState}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Memory</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((item) => (
                  <MemoryRow
                    key={item.id}
                    item={item}
                    selected={selected?.id === item.id}
                    onSelect={() => setSelectedId(item.id)}
                  />
                ))}
                {!records.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className='py-8 text-center text-sm text-muted-foreground'
                    >
                      {query.isLoading
                        ? 'Loading MemoryGate overview...'
                        : sourceState === 'degraded'
                          ? 'MemoryGate returned errors for this overview; no safe memory rows are available.'
                          : 'MemoryGate returned no memories for this view.'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </section>
          <MemoryDetail memory={selected} />
        </div>
      </Main>
    </>
  )
}

function MemoryRow({
  item,
  selected,
  onSelect,
}: {
  item: MemoryRecord
  selected: boolean
  onSelect: () => void
}) {
  return (
    <TableRow
      onClick={onSelect}
      className={cn('cursor-pointer', selected && 'bg-muted/50')}
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
        <Badge variant={stateVariant(item.state)}>{item.state}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={item.confidence === 'high' ? 'secondary' : 'outline'}>
          {item.confidence}
        </Badge>
      </TableCell>
      <TableCell>
        <code className='font-mono text-xs'>
          {relativeTime(item.updated_at)}
        </code>
      </TableCell>
    </TableRow>
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
          Select a memory when MemoryGate returns one.
        </CardContent>
      </Card>
    )
  const detail = buildMemoryDetail(memory)
  return (
    <Card className='h-fit xl:sticky xl:top-4'>
      <CardHeader>
        <div className='flex items-center justify-between gap-3'>
          <CardTitle>Source detail</CardTitle>
          <Badge variant={stateVariant(memory.state)}>{memory.state}</Badge>
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
          <p className='text-sm leading-6'>{detail.claim}</p>
        </div>
        <div>
          <p className='mb-2 text-xs font-medium text-muted-foreground'>
            Evidence/source references
          </p>
          <ol className='space-y-3 border-l pl-4 text-sm'>
            {detail.evidence.map((line) => (
              <li key={line}>
                <p className='text-xs text-muted-foreground'>{line}</p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className='mb-2 text-xs font-medium text-muted-foreground'>
            Linked entities
          </p>
          <div className='flex flex-wrap gap-2'>
            {detail.linkedEntities.length ? (
              detail.linkedEntities.map((entity) => (
                <Badge key={entity} variant='outline'>
                  {entity}
                </Badge>
              ))
            ) : (
              <span className='text-xs text-muted-foreground'>
                Not provided by MemoryGate overview.
              </span>
            )}
          </div>
        </div>
        <div className='rounded-md bg-muted p-3'>
          <p className='text-xs text-muted-foreground'>Source</p>
          <code className='mt-1 block font-mono text-xs break-all'>
            {detail.source}
          </code>
        </div>
      </CardContent>
    </Card>
  )
}

function rank(confidence: string) {
  return confidence === 'high' ? 3 : confidence === 'medium' ? 2 : 1
}
