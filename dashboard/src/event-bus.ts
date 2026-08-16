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

const fixtureEvents: AgentEvent[] = import.meta.env.DEV && import.meta.env.VITE_AGENTGATE_FIXTURES !== '0' ? [
  ['evt_01', 'approval', 'approval binding created', 'Publish release notes', 'ToolGate', 3],
  ['evt_02', 'cron', 'morning briefing assembled', '3 systems checked', 'Automation', 7],
  ['evt_03', 'tool', 'memory evidence scan finished', '2 records need review', 'MemoryGate', 12],
  ['evt_04', 'chat', 'release review updated', 'Owner asked for risk order', 'Hermes', 18],
  ['evt_05', 'health', 'backup verification passed', 'archive hash matched', 'System', 23],
  ['evt_06', 'system', 'container inventory refreshed', '5 services observed', 'System', 31],
  ['evt_07', 'suggestion', 'suggestion queued', 'disk growth threshold', 'Hermes', 38],
  ['evt_08', 'tool', 'policy check passed', 'toolgate policy revision v3', 'ToolGate', 44],
  ['evt_09', 'cron', 'dependency inventory recorded', 'no critical updates', 'Automation', 52],
  ['evt_10', 'chat', 'research evidence attached', 'three citations connected', 'Hermes', 61],
  ['evt_11', 'health', 'memory index healthy', 'collection compact', 'MemoryGate', 74],
  ['evt_12', 'system', 'local retention sweep complete', '14 records retained', 'System', 86],
  ['evt_13', 'approval', 'owner decision recorded', 'inventory update approved', 'ToolGate', 119],
  ['evt_14', 'cron', 'release risk digest completed', 'one anomaly noted', 'Automation', 148],
  ['evt_15', 'tool', 'workspace policy loaded', 'revision 9e4ab21', 'ToolGate', 173],
  ['evt_16', 'chat', 'incident rehearsal drafted', 'awaiting owner review', 'Hermes', 209],
  ['evt_17', 'health', 'hermes heartbeat received', 'latency 124 ms', 'Hermes', 252],
  ['evt_18', 'system', 'archive snapshot created', 'encrypted locally', 'System', 295],
  ['evt_19', 'suggestion', 'automation backlog reprioritized', 'five candidates ranked', 'Hermes', 338],
  ['evt_20', 'tool', 'source chain validated', 'trust research thread', 'MemoryGate', 402],
].map(([id, type, label, detail, source, minutes]) => ({ id: String(id), type: type as AgentEvent['type'], label: String(label), detail: String(detail), source: String(source), at: new Date(Date.now() - Number(minutes) * 60_000).toISOString() })) : []

class AgentEventBus {
  private snapshot: BusSnapshot = {
    coreState: 'idle',
    intensity: 0.18,
    events: fixtureEvents,
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
