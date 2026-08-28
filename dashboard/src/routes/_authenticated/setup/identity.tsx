import { createFileRoute } from '@tanstack/react-router'
import { SetupIdentityPage } from '@/features/agentgate/setup'

export const Route = createFileRoute('/_authenticated/setup/identity')({
  component: SetupIdentityPage,
})
