import { createFileRoute } from '@tanstack/react-router'
import { CharacterListPage } from '@/features/agentgate/character'

export const Route = createFileRoute('/_authenticated/character/')({
  component: CharacterListPage,
})
