import { createFileRoute } from '@tanstack/react-router'
import { ActivityPage } from '@/features/agentgate/activity'

export const Route = createFileRoute('/_authenticated/activity')({
  component: ActivityPage,
})
