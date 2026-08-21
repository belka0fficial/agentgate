import { createFileRoute } from '@tanstack/react-router'
import { SystemPage } from '@/features/agentgate/system'

export const Route = createFileRoute('/_authenticated/system')({
  component: SystemPage,
})
