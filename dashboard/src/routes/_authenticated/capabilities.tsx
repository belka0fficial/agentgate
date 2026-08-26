import { createFileRoute } from '@tanstack/react-router'
import { CapabilitiesPage } from '@/features/agentgate/capabilities'

export const Route = createFileRoute('/_authenticated/capabilities')({
  component: CapabilitiesPage,
})
