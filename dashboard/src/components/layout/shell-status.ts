export type ShellStatusTone =
  | 'available'
  | 'pending'
  | 'unavailable'
  | 'unknown'

type ShellStatusInput = {
  isPending: boolean
  isError: boolean
  hasData?: boolean
}

export function deriveShellStatus({
  isPending,
  isError,
  hasData = false,
}: ShellStatusInput): { label: string; tone: ShellStatusTone } {
  if (isPending) return { label: 'Checking system', tone: 'pending' }
  if (isError) return { label: 'System unavailable', tone: 'unavailable' }
  if (hasData) return { label: 'System data available', tone: 'available' }
  return { label: 'System status unknown', tone: 'unknown' }
}
