import { createFileRoute } from '@tanstack/react-router'
import { CharacterPage } from '@/features/agentgate/character'

export const Route = createFileRoute('/_authenticated/settings/character')({ component: CharacterPage })
