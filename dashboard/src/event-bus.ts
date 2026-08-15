import { useEffect, useState } from 'react'

export type CoreState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'executing' | 'blocked' | 'error'

export type AgentEvent = {
  id: string
  type: 'health' | 'approval' | 'suggestion' | 'chat' | 'tool' | 'cron' | 'system' | 'error'
  label: string
  detail?: string
  source?: string
  at: string
}

type BusSnapshot = {
  coreState: CoreState
  intensity: number
  events: AgentEvent[]
  heartbeat: number
}

type Listener = (snapshot: BusSnapshot) => void

const MAX_EVENTS = 48

class AgentEventBus {
  private snapshot: BusSnapshot = {
    coreState: 'idle',
    intensity: 0.18,
    events: [],
    heartbeat: 0,
  }

  private listeners = new Set<Listener>()

  getSnapshot() {
    return this.snapshot
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    listener(this.snapshot)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setCoreState(coreState: CoreState, intensity = this.snapshot.intensity) {
    this.snapshot = { ...this.snapshot, coreState, intensity }
    this.publish()
  }

  heartbeat(source = 'AgentGate') {
    this.snapshot = { ...this.snapshot, heartbeat: this.snapshot.heartbeat + 1 }
    this.emit({ type: 'health', label: 'health poll ok', source })
  }

  emit(event: Omit<AgentEvent, 'id' | 'at'>) {
    const item: AgentEvent = {
      ...event,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      at: new Date().toISOString(),
    }
    this.snapshot = {
      ...this.snapshot,
      events: [item, ...this.snapshot.events].slice(0, MAX_EVENTS),
    }
    this.publish()
  }

  private publish() {
    this.listeners.forEach((listener) => listener(this.snapshot))
  }
}

export const agentBus = new AgentEventBus()

export function useAgentBus() {
  const [snapshot, setSnapshot] = useState(agentBus.getSnapshot())
  useEffect(() => agentBus.subscribe(setSnapshot), [])
  return snapshot
}
