import { createFileRoute } from '@tanstack/react-router'
import { OrchestrationPage } from '@/features/agentgate/domain-pages'

export const Route = createFileRoute('/_authenticated/orchestration')({
  component: OrchestrationPage,
})
