import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Main } from '@/components/layout/main'
import { getAgentGate } from './api'
import {
  type CapabilitiesResponse,
  capabilitySections,
  capabilityStatus,
} from './capabilities-model'
import { AgentGateHeader } from './page-header'

function badgeVariant(
  status: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'blocked' || status === 'offline') return 'destructive'
  if (status === 'degraded' || status === 'stale') return 'destructive'
  if (status === 'partial') return 'secondary'
  if (status === 'live') return 'default'
  return 'outline'
}

export function CapabilitiesPage() {
  const query = useQuery({
    queryKey: ['agentgate', 'capabilities'],
    queryFn: () => getAgentGate<CapabilitiesResponse>('/api/capabilities'),
  })
  const data = query.data
  const status = capabilityStatus(data)
  const sections = capabilitySections(data)

  return (
    <>
      <AgentGateHeader title='Capabilities' eyebrow='Tools and skills' />
      <Main>
        <div className='mb-6 w-full space-y-2'>
          <div className='flex flex-wrap items-center gap-2'>
            <Badge variant={badgeVariant(status)}>{status}</Badge>
            <span className='text-sm text-muted-foreground'>
              Source-bound capability inventory. Tool args, prompts, secrets,
              host paths, provider URLs, and automation bindings are withheld.
            </span>
          </div>
          <p className='text-sm text-muted-foreground'>
            Partial means at least one source is live while another source is
            degraded. Right now ToolGate can still expose tools even when the Pi
            runtime toolset/skill endpoints return errors.
          </p>
          {query.isError ? (
            <p className='text-sm text-destructive'>
              Capability source unavailable.
            </p>
          ) : null}
        </div>

        <div className='space-y-6'>
          {sections.map((section) => (
            <section key={section.id} className='space-y-3 border-t pt-5'>
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <div>
                  <h2 className='text-base font-medium'>{section.title}</h2>
                  <p className='text-xs text-muted-foreground'>
                    Source: {section.source}
                  </p>
                </div>
                <Badge variant={badgeVariant(section.status)}>
                  {section.status}
                </Badge>
              </div>
              {section.items.length === 0 ? (
                <p className='rounded-md border border-dashed p-3 text-sm text-muted-foreground'>
                  {section.status === 'degraded'
                    ? `${section.title} source unavailable.`
                    : `No ${section.title.toLowerCase()} reported by the source.`}
                </p>
              ) : (
                <div className='divide-y rounded-md border'>
                  {section.items.map((item) => (
                    <div
                      key={item.id}
                      className='flex flex-wrap items-start justify-between gap-3 p-3'
                    >
                      <div className='min-w-0'>
                        <p className='font-medium'>{item.name}</p>
                        <p className='text-xs text-muted-foreground'>
                          {item.metadata_only
                            ? 'Metadata only · details withheld'
                            : 'Source did not mark this safe'}
                        </p>
                      </div>
                      <Badge variant={badgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </Main>
    </>
  )
}
