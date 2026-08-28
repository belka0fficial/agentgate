import { createFileRoute } from '@tanstack/react-router'
import { ContentSection } from '@/features/settings/components/content-section'

export const Route = createFileRoute('/_authenticated/settings/appearance')({
  component: AppearanceDeferredPage,
})

function AppearanceDeferredPage() {
  return (
    <ContentSection
      title='Appearance unavailable'
      desc='Appearance controls are deferred from the text-only MVP.'
    >
      <p className='text-sm text-muted-foreground'>
        No appearance settings are exposed until a real product contract exists.
      </p>
    </ContentSection>
  )
}
