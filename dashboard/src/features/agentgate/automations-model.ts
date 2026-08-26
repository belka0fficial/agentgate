export type Job = {
  id: string
  name?: string
  status?: string
  paused?: boolean
  schedule?: string
  next_run?: string
  last_run?: string
  last_status?: string
  source?: string
  metadata_only?: boolean
  output_withheld?: boolean
}

export type Automation = {
  id: string
  name?: string
  status?: string
  source?: string
  metadata_only?: boolean
  details_withheld?: boolean
}

export type JobsResponse = {
  jobs?: Job[]
  status?: string
  error?: { message?: string }
}

export type AutomationsResponse = {
  jobs?: Job[]
  toolgate_automations?: Automation[]
  errors?: {
    brain?: { message?: string } | null
    toolgate?: { message?: string } | null
  }
  metadata_only?: boolean
}

export function normalizeJobsResponse(
  payload: JobsResponse | Job[] | undefined
): Job[] {
  if (Array.isArray(payload)) return payload
  return payload?.jobs ?? []
}

export function jobStatus(item: Job) {
  if (item.paused) return 'paused'
  return item.status ?? item.last_status ?? 'unknown'
}
