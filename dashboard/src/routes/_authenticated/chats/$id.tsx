import { createFileRoute } from '@tanstack/react-router'
import { ChatDetailPage } from '@/features/agentgate/chat-detail'

export const Route = createFileRoute('/_authenticated/chats/$id')({
  component: () => <ChatDetailPage chatId={Route.useParams().id} />,
})
