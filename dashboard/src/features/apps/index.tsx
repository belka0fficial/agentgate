import { type ChangeEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Blocks,
  Lock,
  Pin,
  Play,
  RefreshCw,
  SearchIcon,
  Square,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Main } from '@/components/layout/main'
import { getAgentGate, postAgentGate } from '@/features/agentgate/api'
import { AgentGateHeader } from '@/features/agentgate/page-header'
import {
  type AppsResponse,
  appActionEnabled,
  appActionsEnabled,
  appStatusLabel,
  lifecycleStatus,
  normalizeAppsResponse,
} from './apps-model'

const route = getRouteApi('/_authenticated/apps/')

type AppType = 'all' | 'pinned' | 'available' | 'planned'

const appText = new Map<AppType, string>([
  ['all', 'All apps'],
  ['pinned', 'Pinned'],
  ['available', 'Available'],
  ['planned', 'Planned'],
])

function badgeVariant(status?: string) {
  if (status === 'blocked' || status === 'offline' || status === 'degraded') {
    return 'destructive' as const
  }
  if (status === 'live' || status === 'available') return 'secondary' as const
  return 'outline' as const
}

export function Apps() {
  const {
    filter = '',
    type = 'all',
    sort: initSort = 'asc',
  } = route.useSearch()
  const navigate = route.useNavigate()
  const queryClient = useQueryClient()

  const [sort, setSort] = useState(initSort)
  const [appType, setAppType] = useState<AppType>(type as AppType)
  const [searchTerm, setSearchTerm] = useState(filter)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['agentgate', 'apps'],
    queryFn: () => getAgentGate<AppsResponse>('/api/apps'),
  })

  const action = useMutation({
    mutationFn: ({
      appId,
      actionName,
    }: {
      appId: string
      actionName: string
    }) => postAgentGate(`/api/apps/${encodeURIComponent(appId)}/${actionName}`),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['agentgate', 'apps'] }),
  })

  const apps = useMemo(() => normalizeAppsResponse(query.data), [query.data])
  const filteredApps = useMemo(() => {
    return [...apps]
      .sort((a, b) =>
        sort === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name)
      )
      .filter((app) => {
        if (appType === 'pinned') return app.pinned
        if (appType === 'available') return app.status === 'available'
        if (appType === 'planned') return lifecycleStatus(app) === 'planned'
        return true
      })
      .filter((app) =>
        `${app.name} ${app.purpose ?? ''} ${app.source_ref ?? ''}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
  }, [appType, apps, searchTerm, sort])

  const selectedApp =
    filteredApps.find((app) => app.id === selectedId) ?? filteredApps[0]

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    navigate({
      search: (prev) => ({ ...prev, filter: e.target.value || undefined }),
    })
  }

  const handleTypeChange = (value: AppType) => {
    setAppType(value)
    navigate({
      search: (prev) => ({
        ...prev,
        type: value === 'all' ? undefined : value,
      }),
    })
  }

  const handleSortChange = (sort: 'asc' | 'desc') => {
    setSort(sort)
    navigate({ search: (prev) => ({ ...prev, sort }) })
  }

  return (
    <>
      <AgentGateHeader title='Apps' eyebrow='Projects' />

      <Main fixed fluid className='px-4 sm:px-6'>
        <div className='mb-3'>
          <Badge variant={badgeVariant(query.data?.source_status?.status)}>
            {query.data?.source_status?.status ??
              (query.isLoading ? 'loading' : 'unknown')}
            <span className='hidden sm:inline'>
              {' · '}
              {query.data?.source_status?.source ?? 'agentgate-local-registry'}
            </span>
          </Badge>
        </div>
        <p className='max-w-4xl text-sm leading-6 text-muted-foreground'>
          Source-bound local app registry metadata. Host paths, commands,
          environment, provider URLs, logs, secrets, and unrestricted tool
          arguments stay server-side. Creation and deployment remain ToolGate
          approval-gated.
        </p>

        <div className='my-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex flex-col gap-3 sm:flex-row'>
            <div className='relative'>
              <SearchIcon className='absolute top-2.5 left-2.5 size-4 text-muted-foreground' />
              <Input
                aria-label='Filter apps and projects'
                placeholder='Filter apps or projects…'
                className='h-9 pl-8 sm:w-64'
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
            <Select value={appType} onValueChange={handleTypeChange}>
              <SelectTrigger className='w-full sm:w-40'>
                <SelectValue>{appText.get(appType)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All apps</SelectItem>
                <SelectItem value='pinned'>Pinned</SelectItem>
                <SelectItem value='available'>Available</SelectItem>
                <SelectItem value='planned'>Planned</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
            <Button variant='outline' disabled>
              <Lock />
              Add app requires ToolGate
            </Button>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className='w-full sm:w-36'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align='end'>
                <SelectItem value='asc'>
                  <span className='flex items-center gap-2'>
                    <ArrowUpAZ size={16} /> Ascending
                  </span>
                </SelectItem>
                <SelectItem value='desc'>
                  <span className='flex items-center gap-2'>
                    <ArrowDownAZ size={16} /> Descending
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Separator className='shadow-sm' />

        {query.isError ? (
          <div className='mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive'>
            Apps registry degraded: {(query.error as Error).message}
          </div>
        ) : null}

        <div className='grid gap-4 pt-4 lg:grid-cols-[minmax(0,1fr)_22rem]'>
          <section className='overflow-hidden rounded-lg border'>
            <div className='hidden md:block'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>App / project</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Lifecycle</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApps.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className='py-10 text-sm text-muted-foreground'
                      >
                        {query.isLoading
                          ? 'Loading source-bound apps…'
                          : 'No user apps reported by the local registry.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredApps.map((app) => {
                      const actionsEnabled = appActionsEnabled(app)
                      return (
                        <TableRow key={app.id} className='align-top'>
                          <TableCell>
                            <button
                              className='text-left font-medium hover:underline'
                              onClick={() => setSelectedId(app.id)}
                            >
                              {app.name}
                            </button>
                            <p className='mt-1 text-xs text-muted-foreground'>
                              {app.purpose ?? 'Purpose not provided'}
                            </p>
                            {app.pinned ? (
                              <p className='mt-1 flex items-center gap-1 text-xs text-muted-foreground'>
                                <Pin className='size-3' /> Pinned
                              </p>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Badge variant={badgeVariant(app.status)}>
                              {app.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <p className='text-sm'>{app.source}</p>
                            <p className='font-mono text-xs break-all text-muted-foreground'>
                              {app.source_ref ??
                                app.local_ref ??
                                'opaque reference unavailable'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant={badgeVariant(lifecycleStatus(app))}>
                              {lifecycleStatus(app)}
                            </Badge>
                            <p className='mt-1 text-xs text-muted-foreground'>
                              {app.lifecycle?.reason ??
                                'Lifecycle metadata only.'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className='flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row'>
                              <Button
                                size='sm'
                                variant='outline'
                                disabled={
                                  !appActionEnabled(app, 'start') ||
                                  action.isPending
                                }
                                onClick={() =>
                                  action.mutate({
                                    appId: app.id,
                                    actionName: 'start',
                                  })
                                }
                              >
                                {actionsEnabled ? <Play /> : <Lock />} Start
                              </Button>
                              <Button
                                size='sm'
                                variant='outline'
                                disabled={
                                  !appActionEnabled(app, 'stop') ||
                                  action.isPending
                                }
                                onClick={() =>
                                  action.mutate({
                                    appId: app.id,
                                    actionName: 'stop',
                                  })
                                }
                              >
                                {actionsEnabled ? <Square /> : <Lock />} Stop
                              </Button>
                              <Button
                                size='sm'
                                variant='secondary'
                                disabled={
                                  !appActionEnabled(app, 'restart') ||
                                  action.isPending
                                }
                                onClick={() =>
                                  action.mutate({
                                    appId: app.id,
                                    actionName: 'restart',
                                  })
                                }
                              >
                                {actionsEnabled ? <RefreshCw /> : <Lock />}{' '}
                                Restart
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div data-mobile-records className='divide-y bg-card md:hidden'>
              {filteredApps.length === 0 ? (
                <div className='px-4 py-8 text-sm text-muted-foreground'>
                  {query.isLoading
                    ? 'Loading source-bound apps…'
                    : 'No user apps reported by the local registry.'}
                </div>
              ) : (
                filteredApps.map((app) => {
                  const actionsEnabled = appActionsEnabled(app)
                  return (
                    <article key={app.id} className='px-4 py-4'>
                      <button
                        type='button'
                        className='w-full text-left'
                        onClick={() => setSelectedId(app.id)}
                      >
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <h3 className='text-sm font-medium'>{app.name}</h3>
                            <p className='mt-0.5 text-xs leading-5 text-muted-foreground'>
                              {app.purpose ?? 'Purpose not provided'}
                            </p>
                          </div>
                          <Badge variant={badgeVariant(app.status)}>
                            {app.status}
                          </Badge>
                        </div>
                        <p className='mt-2 font-mono text-[11px] break-all text-muted-foreground'>
                          {app.source} · {lifecycleStatus(app)}
                        </p>
                      </button>
                      <div className='mt-4 grid grid-cols-3 gap-2'>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={
                            !appActionEnabled(app, 'start') || action.isPending
                          }
                          onClick={() =>
                            action.mutate({
                              appId: app.id,
                              actionName: 'start',
                            })
                          }
                        >
                          {actionsEnabled ? <Play /> : <Lock />} Start
                        </Button>
                        <Button
                          size='sm'
                          variant='outline'
                          disabled={
                            !appActionEnabled(app, 'stop') || action.isPending
                          }
                          onClick={() =>
                            action.mutate({ appId: app.id, actionName: 'stop' })
                          }
                        >
                          {actionsEnabled ? <Square /> : <Lock />} Stop
                        </Button>
                        <Button
                          size='sm'
                          variant='secondary'
                          disabled={
                            !appActionEnabled(app, 'restart') ||
                            action.isPending
                          }
                          onClick={() =>
                            action.mutate({
                              appId: app.id,
                              actionName: 'restart',
                            })
                          }
                        >
                          {actionsEnabled ? <RefreshCw /> : <Lock />} Restart
                        </Button>
                      </div>
                    </article>
                  )
                })
              )}
            </div>
          </section>

          <aside className='rounded-lg border p-4'>
            <div className='mb-3 flex items-center gap-2'>
              <Blocks className='size-4' />
              <h2 className='text-sm font-medium'>App details</h2>
            </div>
            {selectedApp ? (
              <dl className='space-y-3 text-sm'>
                <div>
                  <dt className='text-xs text-muted-foreground'>Name</dt>
                  <dd>{selectedApp.name}</dd>
                </div>
                <div>
                  <dt className='text-xs text-muted-foreground'>Purpose</dt>
                  <dd>{selectedApp.purpose ?? 'not provided'}</dd>
                </div>
                <div>
                  <dt className='text-xs text-muted-foreground'>
                    Status/source
                  </dt>
                  <dd>{appStatusLabel(selectedApp)}</dd>
                </div>
                <div>
                  <dt className='text-xs text-muted-foreground'>Pinned</dt>
                  <dd>{selectedApp.pinned ? 'yes' : 'no'}</dd>
                </div>
                <div>
                  <dt className='text-xs text-muted-foreground'>
                    Opaque reference
                  </dt>
                  <dd className='font-mono text-xs break-all'>
                    {selectedApp.local_ref ??
                      selectedApp.source_ref ??
                      'not contracted'}
                  </dd>
                </div>
                <div>
                  <dt className='text-xs text-muted-foreground'>
                    Approval boundary
                  </dt>
                  <dd>
                    Lifecycle and deployment controls are disabled unless a real
                    ToolGate-bound action contract marks them available.
                  </dd>
                </div>
              </dl>
            ) : (
              <p className='text-sm text-muted-foreground'>
                Select an app to inspect metadata.
              </p>
            )}
          </aside>
        </div>
      </Main>
    </>
  )
}
