import { createFileRoute } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from '@/features/agentgate/page-header'

export const Route = createFileRoute('/_authenticated/settings/display')({
  component: DisplayDeferredPage,
})

function DisplayDeferredPage() {
  return (
    <>
      <AgentGateHeader title='Display unavailable' />
      <Main>
        <p className='text-sm text-muted-foreground'>
          Display and layout controls are deferred from the text-only MVP.
        </p>
      </Main>
    </>
  )
}
