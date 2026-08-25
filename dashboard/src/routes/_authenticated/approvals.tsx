import { createFileRoute } from '@tanstack/react-router'
import { ApprovalsPage } from '@/features/agentgate/approvals'

export const Route = createFileRoute('/_authenticated/approvals')({
  component: ApprovalsPage,
})
