import { createFileRoute } from '@tanstack/react-router'
import { SuggestionsPage } from '@/features/agentgate/suggestions'

export const Route = createFileRoute('/_authenticated/suggestions')({
  component: SuggestionsPage,
})
