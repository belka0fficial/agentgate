import { createFileRoute } from '@tanstack/react-router'
import { JobsPage } from '@/features/agentgate/automations'

export const Route = createFileRoute('/_authenticated/jobs')({
  component: JobsPage,
})
