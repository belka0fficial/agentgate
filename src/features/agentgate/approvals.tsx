import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  getAgentGate,
  relativeTime,
  type Approval,
  type DecidedApproval,
} from './api'
import { AgentGateHeader } from './page-header'

const inlineApprovalKey = 'agentgate:inline-approval:appr_01'

export function ApprovalsPage() {
  const [source, setSource] = useState('All')
  const [inlineDecision, setInlineDecision] = useState<
    'approved' | 'rejected' | null
  >(null)
  const approvals = useQuery({
    queryKey: ['agentgate', 'approvals'],
    queryFn: () => getAgentGate<Approval[]>('/api/approvals'),
  })
  const history = useQuery({
    queryKey: ['agentgate', 'approvals', 'history'],
    queryFn: () => getAgentGate<DecidedApproval[]>('/api/approvals/history'),
  })
  useEffect(() => {
    function readInlineDecision() {
      const value = localStorage.getItem(inlineApprovalKey)
      setInlineDecision(
        value === 'approved' || value === 'rejected' ? value : null
      )
    }

    readInlineDecision()
    window.addEventListener('storage', readInlineDecision)
    window.addEventListener('agentgate:inline-approval', readInlineDecision)

    return () => {
      window.removeEventListener('storage', readInlineDecision)
      window.removeEventListener(
        'agentgate:inline-approval',
        readInlineDecision
      )
    }
  }, [])

  function decideInline(next: 'approved' | 'rejected') {
    localStorage.setItem(inlineApprovalKey, next)
    window.dispatchEvent(
      new CustomEvent('agentgate:inline-approval', {
        detail: { id: 'appr_01', decision: next },
      })
    )
  }

  const pending = inlineDecision
    ? (approvals.data ?? []).filter((item) => item.id !== 'appr_01')
    : (approvals.data ?? [])
  const inlineApproval = inlineDecision
    ? approvals.data?.find((item) => item.id === 'appr_01')
    : null
  const historyRows = [
    ...(inlineApproval && inlineDecision
      ? [
          {
            ...inlineApproval,
            decision: inlineDecision,
            decided_at: new Date().toISOString(),
            decided_by: 'Owner',
          } satisfies DecidedApproval,
        ]
      : []),
    ...(history.data ?? []).filter((item) => item.id !== 'appr_01'),
  ]
  const rows = pending.filter(
    (item) => source === 'All' || item.source === source
  )
  const decided = historyRows.filter(
    (item) => source === 'All' || item.source === source
  )
  return (
    <>
      <AgentGateHeader
        actions={<ApprovalToolbar source={source} onSourceChange={setSource} />}
      />
      <Main>
        <p className='mb-6 text-sm text-muted-foreground'>
          Review exactly what the agent is asking to do.
        </p>
        <section>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>Waiting for you</h2>
            <p className='text-xs text-muted-foreground'>
              {rows.length} owner decisions match this source filter.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Binding</TableHead>
                <TableHead className='text-right'>Decision</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className='whitespace-normal'>
                    <p className='font-medium'>{item.title}</p>
                    <p className='mt-1 text-xs text-muted-foreground'>
                      {item.details}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.severity === 'high' ? 'destructive' : 'secondary'
                      }
                    >
                      {item.source}
                    </Badge>
                  </TableCell>
                  <TableCell className='whitespace-normal'>
                    <code className='font-mono text-xs text-muted-foreground'>
                      {item.binding.type}
                      <br />
                      {item.binding.digest}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-2'>
                      <Button
                        size='sm'
                        variant='secondary'
                        onClick={() =>
                          item.id === 'appr_01'
                            ? decideInline('approved')
                            : undefined
                        }
                      >
                        <Check />
                        Approve
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='border-destructive text-destructive hover:bg-destructive hover:text-white'
                        onClick={() =>
                          item.id === 'appr_01'
                            ? decideInline('rejected')
                            : undefined
                        }
                      >
                        <X />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
        <section className='mt-8'>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>Decided history</h2>
            <p className='text-xs text-muted-foreground'>
              Recent owner decisions retained for audit.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Decision</TableHead>
                <TableHead>Decided</TableHead>
                <TableHead>By</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decided.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <p className='font-medium'>{item.title}</p>
                    <code className='font-mono text-xs text-muted-foreground'>
                      {item.binding.type}
                    </code>
                  </TableCell>
                  <TableCell>
                    <Badge variant='outline'>{item.source}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        item.decision === 'rejected'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {item.decision}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className='font-mono text-xs'>
                      {relativeTime(item.decided_at)}
                    </code>
                  </TableCell>
                  <TableCell className='text-sm text-muted-foreground'>
                    {item.decided_by}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      </Main>
    </>
  )
}

function ApprovalToolbar({
  source,
  onSourceChange,
}: {
  source: string
  onSourceChange: (value: string) => void
}) {
  return (
    <Select value={source} onValueChange={onSourceChange}>
      <SelectTrigger className='h-8 w-36 border-0 bg-muted/45 px-2 shadow-none'>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {['All', 'ToolGate', 'Hermes'].map((item) => (
          <SelectItem key={item} value={item}>
            {item === 'All' ? 'All sources' : item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
