import { cn } from '@/lib/utils'
import { SidebarTrigger } from '@/components/ui/sidebar'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  return (
    <header
      className={cn(
        'z-30 h-14 border-b bg-background/95',
        fixed && 'header-fixed peer/header sticky top-0 w-[inherit]',
        className
      )}
      {...props}
    >
      <div className='flex h-full items-center gap-2 px-4'>
        <SidebarTrigger
          aria-label='Open navigation'
          className='size-9 md:hidden'
        />
        {children}
      </div>
    </header>
  )
}
