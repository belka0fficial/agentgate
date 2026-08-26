import { createFileRoute } from '@tanstack/react-router'
import { CharacterDetailPage } from '@/features/agentgate/character'

export const Route = createFileRoute('/_authenticated/character/$id')({
  component: CharacterRouteComponent,
})

function CharacterRouteComponent() {
  const { id } = Route.useParams()
  return <CharacterDetailPage personaId={id} />
}
