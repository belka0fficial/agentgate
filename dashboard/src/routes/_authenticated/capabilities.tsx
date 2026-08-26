import { createFileRoute } from '@tanstack/react-router'
import { CapabilitiesPage } from '@/features/agentgate/domain-pages'

export const Route = createFileRoute('/_authenticated/capabilities')({
  component: CapabilitiesPage,
})
