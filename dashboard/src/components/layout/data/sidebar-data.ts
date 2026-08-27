import {
  Boxes,
  BriefcaseBusiness,
  Command,
  GitBranch,
  LayoutDashboard,
  MemoryStick,
  MessagesSquare,
  Monitor,
  Package,
  ShieldCheck,
} from 'lucide-react'
import { ConkerAvatar } from '@/features/agentgate/conker-avatar'
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
      title: 'AgentGate',
      items: [
        { title: 'Companion', url: '/companion', icon: ConkerAvatar },
        { title: 'Chats', url: '/chats', icon: MessagesSquare },
        { title: 'Approvals', url: '/approvals', icon: ShieldCheck },
        { title: 'Command', url: '/', icon: LayoutDashboard },
        { title: 'Orchestration', url: '/orchestration', icon: GitBranch },
        { title: 'Workforce', url: '/workforce', icon: BriefcaseBusiness },
        { title: 'Jobs', url: '/jobs', icon: Boxes },
        { title: 'Capabilities', url: '/capabilities', icon: Package },
        { title: 'Memory', url: '/memory', icon: MemoryStick },
        { title: 'Apps', url: '/apps/', icon: Boxes },
        { title: 'System', url: '/system', icon: Monitor },
      ],
    },
  ],
}
