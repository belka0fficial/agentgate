import { Outlet } from '@tanstack/react-router'
import { Main } from '@/components/layout/main'

export function Settings() {
  return (
    <Main fluid className='px-4 py-6 sm:px-6'>
      <Outlet />
    </Main>
  )
}
