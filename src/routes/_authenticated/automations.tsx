import { createFileRoute } from '@tanstack/react-router'
import { AutomationsPage } from '@/features/agentgate/automations'

export const Route = createFileRoute('/_authenticated/automations')({
  component: AutomationsPage,
})
