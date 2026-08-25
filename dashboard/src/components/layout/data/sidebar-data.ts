import {
  Bell,
  Clock,
  Command,
  LayoutDashboard,
  MessagesSquare,
  Monitor,
  Package,
  ShieldCheck,
  UserCog,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Owner',
    email: 'local operator',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'AgentGate',
      logo: Command,
      plan: 'Local agent console',
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Command',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Approvals',
          url: '/approvals',
          icon: ShieldCheck,
        },
        {
          title: 'Chats',
          url: '/chats',
          badge: '9',
          icon: MessagesSquare,
        },
        { title: 'System', url: '/system', icon: Monitor },
        { title: 'Automations', url: '/automations', icon: Clock },
        { title: 'Memory', url: '/memory', icon: Package },
        { title: 'Suggestions', url: '/suggestions', icon: Bell },
        { title: 'Character', url: '/character', icon: UserCog },
      ],
    },
  ],
}
