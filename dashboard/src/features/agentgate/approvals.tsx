import { useState } from 'react'
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
  postAgentGate,
  relativeTime,
  type Approval,
  type DecidedApproval,
} from './api'
import { AgentGateHeader } from './page-header'

export function ApprovalsPage() {
  const [source, setSource] = useState('all')
  const approvals = useQuery({
    queryKey: ['agentgate', 'approvals'],
    queryFn: () => getAgentGate<Approval[]>('/api/approvals'),
  })
  const [decidedRows, setDecidedRows] = useState<DecidedApproval[]>([])

  async function decideApproval(
    item: Approval,
    decision: 'approved' | 'rejected'
  ) {
    await postAgentGate(
      `/api/verifications/${encodeURIComponent(item.source)}/${encodeURIComponent(item.id)}/decision`,
      { decision }
    )
    setDecidedRows((current) => [
      {
        ...item,
        decision,
        decided_at: new Date().toISOString(),
        decided_by: 'Owner',
      },
      ...current.filter((row) => row.id !== item.id),
    ])
    await approvals.refetch()
  }

  const rows = (approvals.data ?? []).filter(
    (item) => source === 'all' || item.source.toLowerCase() === source
  )
  const decided = decidedRows.filter(
    (item) => source === 'all' || item.source.toLowerCase() === source
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
                        onClick={() => void decideApproval(item, 'approved')}
                      >
                        <Check />
                        Approve
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='border-destructive text-destructive hover:bg-destructive hover:text-white'
                        onClick={() => void decideApproval(item, 'rejected')}
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
            <h2 className='text-sm font-medium'>Decisions this page</h2>
            <p className='text-xs text-muted-foreground'>
              Decisions made during this page session; source audit remains
              authoritative.
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
        {[
          ['all', 'All sources'],
          ['toolgate', 'ToolGate'],
          ['brain', 'Brain'],
        ].map(([value, label]) => (
          <SelectItem key={value} value={value}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
