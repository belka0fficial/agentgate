import { createFileRoute } from '@tanstack/react-router'
import { CharacterDetailPage } from '@/features/agentgate/character'

export const Route = createFileRoute('/_authenticated/character/$id')({
  component: () => <CharacterDetailPage personaId={Route.useParams().id} />,
})
