import { createFileRoute } from '@tanstack/react-router'
import { WorkforcePage } from '@/features/agentgate/domain-pages'

export const Route = createFileRoute('/_authenticated/agents')({
  component: WorkforcePage,
})
