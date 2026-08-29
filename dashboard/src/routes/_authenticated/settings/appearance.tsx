import { createFileRoute } from '@tanstack/react-router'
import { ThemeStudio } from '@/features/settings/theme-studio'

export const Route = createFileRoute('/_authenticated/settings/appearance')({
  component: ThemeStudio,
})
