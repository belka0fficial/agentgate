import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
        <div className='mb-6 space-y-2'>
          <div className='flex items-center gap-2'>
            <Badge variant={badgeVariant(status)}>{status}</Badge>
            <span className='text-sm text-muted-foreground'>
              Source-bound capability inventory. Tool args, prompts, secrets,
              host paths, provider URLs, and automation bindings are withheld.
            </span>
          </div>
          {query.isError ? (
            <p className='text-sm text-destructive'>
              Capability source unavailable.
            </p>
          ) : null}
        </div>

        <div className='grid gap-4 md:grid-cols-2'>
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className='flex items-center justify-between text-base'>
                  <span>{section.title}</span>
                  <div className='flex items-center gap-2'>
                    <Badge variant={badgeVariant(section.status)}>
                      {section.status}
                    </Badge>
                    <Badge variant='outline'>{section.source}</Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {section.items.length === 0 ? (
                  <p className='text-sm text-muted-foreground'>
                    {section.status === 'degraded'
                      ? `${section.title} source unavailable.`
                      : `No ${section.title.toLowerCase()} reported by the source.`}
                  </p>
                ) : (
                  <ul className='space-y-3'>
                    {section.items.map((item) => (
                      <li key={item.id} className='rounded-md border p-3'>
                        <div className='flex items-start justify-between gap-3'>
                          <div>
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
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </Main>
    </>
  )
}
