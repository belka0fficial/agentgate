import { createFileRoute } from '@tanstack/react-router'
import { ChatDetailPage } from '@/features/agentgate/chat-detail'

export const Route = createFileRoute('/_authenticated/chats/$id')({
  component: ChatRouteComponent,
})

function ChatRouteComponent() {
  const { id } = Route.useParams()
  return <ChatDetailPage chatId={id} />
}
