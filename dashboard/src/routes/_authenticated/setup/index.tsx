import { createFileRoute } from '@tanstack/react-router'
import { SetupOverviewPage } from '@/features/agentgate/setup'

export const Route = createFileRoute('/_authenticated/setup/')({
  component: SetupOverviewPage,
})
