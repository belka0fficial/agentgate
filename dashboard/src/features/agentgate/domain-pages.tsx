import { DomainShell } from './domain-shell'

export function CompanionPage() {
  return (
    <DomainShell
      title='Companion'
      eyebrow='Conker Journal'
      status='planned'
      purpose='The Main Companion space will be the human-facing place for proactive findings, completed work, requests that need the owner, and normal quick chat.'
      source='AgentGate Journal view over runtime events, approvals, runs, apps, and owner review state.'
      next='Next slice: migrate useful Suggestions into source-bound Journal entries instead of keeping Suggestions as a top-level destination.'
    />
  )
}

export function CapabilitiesPage() {
  return (
    <DomainShell
      title='Capabilities'
      eyebrow='Tools and skills'
      status='planned'
      purpose='Capabilities separates Tools, Skills, ToolGate Automations, and Connections from runtime Jobs.'
      source='ToolGate for tools, deterministic Automations, approvals, and audit; MemoryGate for future product Skills; runtime adapter for agent-visible capability summaries.'
      next='Next slice: split the current merged Automations API into Jobs plus ToolGate Automation summaries.'
    />
  )
}

export function OrchestrationPage() {
  return (
    <DomainShell
      title='Orchestration'
      eyebrow='Flows and runs'
      status='planned'
      purpose='Orchestration will show Teams, Flows, bounded Loops, Runs, traces, and handoff evidence without exposing hidden reasoning.'
      source='Pi runtime owns execution definitions and run events. AgentGate owns presentation drafts and trace review UX.'
      next='Next slice after Jobs/Capabilities: define and consume versioned Run/Trace events.'
    />
  )
}

export function WorkforcePage() {
  return (
    <DomainShell
      title='Workforce'
      eyebrow='Agents and teams'
      status='planned'
      purpose='Workforce will classify Companions, Workers, Teams, and temporary Subagents without turning every runtime helper into a character.'
      source='Pi runtime for agent/team definitions and runtime instances; AgentGate for character/profile presentation joins.'
      next='Next slice: add metadata-only Agent Studio after the operational foundation is truthful.'
    />
  )
}
