import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { getCookie } from '@/lib/cookies'
import { cn } from '@/lib/utils'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { SkipToMain } from '@/components/skip-to-main'
import { getCharacterProfile } from '@/features/agentgate/api'
import { OwnerGate } from '@/features/agentgate/owner-gate'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'
  return (
    <SearchProvider>
      <LayoutProvider>
        <OwnerGate>
          <FirstRunCompanionRedirect />
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
        </OwnerGate>
      </LayoutProvider>
    </SearchProvider>
  )
}

function FirstRunCompanionRedirect() {
  const navigate = useNavigate()
  const location = useLocation()
  const character = useQuery({
    queryKey: ['agentgate', 'character'],
    queryFn: getCharacterProfile,
    retry: false,
  })

  useEffect(() => {
    const currentPath = window.location.pathname
    const canStayWithoutCompanion =
      currentPath === '/character' || currentPath.startsWith('/settings')
    if (character.data?.configured === false && !canStayWithoutCompanion) {
      void navigate({ to: '/character' })
    }
  }, [character.data?.configured, location.pathname, navigate])

  return null
}
