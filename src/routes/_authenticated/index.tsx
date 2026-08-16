import { createFileRoute } from '@tanstack/react-router'
import { CommandPage } from '@/features/agentgate/command'

export const Route = createFileRoute('/_authenticated/')({
  component: CommandPage,
})
