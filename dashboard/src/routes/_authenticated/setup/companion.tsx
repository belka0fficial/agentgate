import { createFileRoute } from '@tanstack/react-router'
import { SetupCompanionPage } from '@/features/agentgate/setup'

export const Route = createFileRoute('/_authenticated/setup/companion')({
  component: SetupCompanionPage,
})
