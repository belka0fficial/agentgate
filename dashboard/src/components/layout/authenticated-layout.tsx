import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { getAgentGate } from '@/features/agentgate/api'
import { OwnerGate } from '@/features/agentgate/owner-gate'
import type { SetupStatus } from '@/features/agentgate/setup'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  return (
    <SearchProvider>
      <LayoutProvider>
        <OwnerGate>
          <SetupRequirementGate>
            <SidebarProvider defaultOpen={defaultOpen}>
              <SkipToMain />
              <AppSidebar />
              <SidebarInset
                className={cn(
                  // Set content container, so we can use container queries
                  '@container/content',

                  // If layout is fixed, set the height
                  // to 100svh to prevent overflow
                  'has-data-[layout=fixed]:h-svh',

                  // If layout is fixed and sidebar is inset,
                  // set the height to 100svh - spacing (total margins) to prevent overflow
                  'peer-data-[variant=inset]:has-data-[layout=fixed]:h-[calc(100svh-(var(--spacing)*4))]'
                )}
              >
                {children ?? <Outlet />}
              </SidebarInset>
            </SidebarProvider>
          </SetupRequirementGate>
        </OwnerGate>
      </LayoutProvider>
    </SearchProvider>
  )
}

function SetupRequirementGate({ children }: { children: ReactNode }) {
  const location = useLocation()
  const setup = useQuery({
    queryKey: ['agentgate', 'setup'],
    queryFn: () => getAgentGate<SetupStatus>('/api/setup/status'),
    retry: false,
  })

  if (setup.isLoading) {
    return <SetupGateState title='Checking setup requirements' />
  }
  if (setup.isError || !setup.data) {
    return (
      <SetupGateState
        title='Could not load setup requirements'
        action={
          <button
            className='rounded-md border px-3 py-2 text-sm'
            onClick={() => setup.refetch()}
          >
            Retry
          </button>
        }
      />
    )
  }

  const currentPath = location.pathname
  if (
    setup.data.next_required_step === 'identity' &&
    currentPath !== '/setup/identity'
  ) {
    return <Navigate to='/setup/identity' replace />
  }
  const companion = setup.data.steps.find((step) => step.id === 'companion')
  if (currentPath === '/companion' && companion?.status !== 'configured') {
    return <Navigate to='/setup/companion' replace />
  }
  return <>{children}</>
}

function SetupGateState({
  title,
  action,
}: {
  title: string
  action?: ReactNode
}) {
  return (
    <main className='grid min-h-svh place-items-center bg-background px-6 text-foreground'>
      <section className='max-w-md text-center'>
        <p className='text-sm font-medium'>{title}</p>
        <p className='mt-2 text-xs leading-5 text-muted-foreground'>
          Protected AgentGate content stays hidden until setup requirements
          resolve.
        </p>
        {action ? <div className='mt-4'>{action}</div> : null}
      </section>
    </main>
  )
}
