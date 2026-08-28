import { Outlet, useLocation } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'
import { AgentGateHeader } from '@/features/agentgate/page-header'

export function Settings() {
  const location = useLocation()
  const childOwnsHeader = location.pathname === '/settings/character'

  return (
    <>
      {childOwnsHeader ? null : <AgentGateHeader />}
      <Main fluid className='px-4 py-6 sm:px-6'>
        <Outlet />
      </Main>
    </>
  )
}
