import { createFileRoute } from '@tanstack/react-router'
import { MemoryPage } from '@/features/agentgate/memory'

export const Route = createFileRoute('/_authenticated/memory')({ component: MemoryPage })
