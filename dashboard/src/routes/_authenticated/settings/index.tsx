import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/settings/')({
  component: () => <Navigate to='/settings/gateways' replace />,
})
