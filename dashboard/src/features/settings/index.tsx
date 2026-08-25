import { Outlet } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'

export function Settings() {
  return (
    <>
      <Header>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='grid place-items-start overflow-auto bg-muted/10 px-4 py-6 md:px-8'>
        <section className='mx-auto w-full max-w-6xl rounded-2xl border border-border/70 bg-background/95 p-5 shadow-2xl ring-1 ring-white/5 md:p-6'>
          <Outlet />
        </section>
      </Main>
    </>
  )
}
