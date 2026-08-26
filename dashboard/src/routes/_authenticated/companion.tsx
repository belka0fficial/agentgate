import { createFileRoute } from '@tanstack/react-router'
import { CompanionPage } from '@/features/agentgate/domain-pages'

export const Route = createFileRoute('/_authenticated/companion')({
  component: CompanionPage,
})
