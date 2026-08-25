import type { ReactNode } from 'react'
import { Router } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { GatewaySettings } from './gateways'

export function SettingsDialog({
  trigger,
  open,
  onOpenChange,
}: {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className='grid max-h-[min(840px,calc(100dvh-2rem))] w-[min(94vw,1180px)] max-w-none grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-xl border border-border/70 bg-popover/95 p-0 shadow-2xl ring-1 ring-white/5 sm:max-w-none'>
        <DialogHeader className='border-b px-6 pt-6 pb-4 text-left'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='flex items-start gap-3'>
              <div className='mt-0.5 rounded-lg border bg-muted/40 p-2'>
                <Router className='size-5 text-muted-foreground' />
              </div>
              <div>
                <DialogTitle>Gateway settings</DialogTitle>
                <DialogDescription className='mt-1 max-w-2xl leading-6'>
                  Real AgentGate settings: inspect providers and edit the active
                  model route through the Pi adapter. Secrets stay server-side.
                </DialogDescription>
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Badge variant='secondary'>owner gated</Badge>
              <Badge variant='outline'>provider metadata</Badge>
              <Badge variant='outline'>route save</Badge>
            </div>
          </div>
        </DialogHeader>

        <main className='min-h-0 overflow-y-auto px-6 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
          <GatewaySettings />
          <div className='mt-6 rounded-lg border border-dashed bg-muted/20 p-4 text-sm leading-6 text-muted-foreground'>
            Provider add/delete is not exposed yet because provider credentials
            and upstream URLs must stay server-side. Add/delete will become a
            real setting only when Pi adapter provides a safe owner-authenticated
            provider registry endpoint.
          </div>
          <div className='sr-only'>
            <Button type='button'>Gateway settings active</Button>
          </div>
        </main>
      </DialogContent>
    </Dialog>
  )
}
