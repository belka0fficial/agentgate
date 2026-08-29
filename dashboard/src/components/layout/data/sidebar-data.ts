import {
  Boxes,
  Bot,
  Command,
  GitBranch,
  LayoutDashboard,
  MemoryStick,
  MessageSquarePlus,
  MessagesSquare,
  Monitor,
  Package,
  ShieldCheck,
  Sparkles,
  Wrench,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Owner',
    email: 'local operator',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [{ name: 'AgentGate', logo: Command, plan: 'Local agent console' }],
  navGroups: [
    {
      title: 'Command',
      items: [
        { title: 'Command', url: '/', icon: LayoutDashboard },
        { title: 'Chats', url: '/chats', icon: MessagesSquare },
        { title: 'Activity', url: '/activity', icon: Monitor },
      ],
    },
    {
      title: 'Agents',
      items: [
        { title: 'Companion', url: '/companion', icon: Bot },
        { title: 'Agents', url: '/agents', icon: Bot },
        { title: 'Agent Studio', url: '/character', icon: Sparkles },
      ],
    },
    {
      title: 'Operations',
      items: [
        { title: 'Approvals', url: '/approvals', icon: ShieldCheck },
        { title: 'Orchestration', url: '/orchestration', icon: GitBranch },
        { title: 'Jobs', url: '/jobs', icon: Boxes },
        { title: 'Automations', url: '/automations', icon: Wrench },
      ],
    },
    {
      title: 'Knowledge',
      items: [
        { title: 'Capabilities', url: '/capabilities', icon: Package },
        { title: 'Memory', url: '/memory', icon: MemoryStick },
        { title: 'Suggestions', url: '/suggestions', icon: Sparkles },
      ],
    },
    {
      title: 'Workspace',
      items: [
        { title: 'Apps', url: '/apps/', icon: Boxes },
        { title: 'Tasks', url: '/tasks', icon: MessageSquarePlus },
        { title: 'Users', url: '/users', icon: Bot },
      ],
    },
    {
      title: 'System',
      items: [{ title: 'System', url: '/system', icon: Monitor }],
    },
  ],
}
