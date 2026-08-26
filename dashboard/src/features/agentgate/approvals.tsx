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
import { getAgentGate, postAgentGate, relativeTime, type Approval } from './api'
import {
  historyUnavailableCopy,
  normalizeVerificationsResponse,
  pendingDecisionConfirmed,
  type VerificationCenter,
} from './approvals-model'
import { AgentGateHeader } from './page-header'

export function ApprovalsPage() {
  const [source, setSource] = useState('all')
  const approvals = useQuery({
    queryKey: ['agentgate', 'approvals'],
    queryFn: async () =>
      normalizeVerificationsResponse(
        await getAgentGate<VerificationCenter>('/api/approvals')
      ),
  })
  const [decisionError, setDecisionError] = useState<string | null>(null)
  const [decidingId, setDecidingId] = useState<string | null>(null)

  async function decideApproval(
    item: Approval,
    decision: 'approved' | 'rejected'
  ) {
    setDecisionError(null)
    setDecidingId(`${item.source}:${item.source_id}`)
    try {
      await postAgentGate(
        `/api/verifications/${encodeURIComponent(item.source)}/${encodeURIComponent(item.source_id)}/decision`,
        { decision }
      )
      const readBack = await approvals.refetch()
      const center = readBack.data
      if (center && !pendingDecisionConfirmed(item, center)) {
        setDecisionError(
          'Decision sent, but read-back still reports this approval as pending. Source remains authoritative.'
        )
      }
    } catch (error) {
      setDecisionError(
        error instanceof Error ? error.message : 'Decision failed.'
      )
    } finally {
      setDecidingId(null)
    }
  }

  const center = approvals.data ?? normalizeVerificationsResponse(undefined)
  const rows = center.pending.filter(
    (item) => source === 'all' || item.source.toLowerCase() === source
  )
  return (
    <>
      <AgentGateHeader
        actions={<ApprovalToolbar source={source} onSourceChange={setSource} />}
      />
      <Main>
        <p className='mb-6 text-sm text-muted-foreground'>
          Review source-bound approval requests using metadata-only action
          summaries.
        </p>
        <section>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>Waiting for you</h2>
            <p className='text-xs text-muted-foreground'>
              {rows.length} real pending source-bound requests match this source
              filter.
            </p>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Binding</TableHead>
                <TableHead>Risk / expiry</TableHead>
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
                  <TableCell className='text-xs text-muted-foreground'>
                    <Badge
                      variant={
                        item.severity === 'high' ? 'destructive' : 'secondary'
                      }
                    >
                      {item.severity}
                    </Badge>
                    <div className='mt-1'>
                      Expires {relativeTime(item.expires_at)}
                    </div>
                    <div className='mt-1'>
                      Payload withheld:{' '}
                      {item.action_payload_withheld ? 'yes' : 'unknown'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex justify-end gap-2'>
                      <Button
                        size='sm'
                        variant='secondary'
                        disabled={
                          decidingId === `${item.source}:${item.source_id}`
                        }
                        onClick={() => void decideApproval(item, 'approved')}
                      >
                        <Check />
                        Approve
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='border-destructive text-destructive hover:bg-destructive hover:text-white'
                        disabled={
                          decidingId === `${item.source}:${item.source_id}`
                        }
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
        {decisionError ? (
          <div className='mt-4 rounded-lg border border-destructive/40 p-3 text-sm text-destructive'>
            {decisionError}
          </div>
        ) : null}
        <section className='mt-8'>
          <div className='mb-2 border-b pb-3'>
            <h2 className='text-sm font-medium'>Approval history</h2>
            <p className='text-xs text-muted-foreground'>
              {historyUnavailableCopy(center.history)}
            </p>
          </div>
          <div className='rounded-lg border border-dashed p-4 text-sm text-muted-foreground'>
            Approved, rejected, dismissed, and expired history is not retained
            in AgentGate unless ToolGate or Brain exposes a real source-bound
            persistence/query contract. No localStorage or page-session history
            is shown here.
          </div>
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
