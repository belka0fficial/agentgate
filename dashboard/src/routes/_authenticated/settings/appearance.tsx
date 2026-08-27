import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from '@/features/agentgate/page-header'

export const Route = createFileRoute('/_authenticated/settings/appearance')({
  component: AppearanceDeferredPage,
})

function AppearanceDeferredPage() {
  return (
    <>
      <AgentGateHeader title='Appearance unavailable' />
      <Main>
        <p className='text-sm text-muted-foreground'>
          Appearance controls are deferred from the text-only MVP.
        </p>
      </Main>
    </>
  )
}
