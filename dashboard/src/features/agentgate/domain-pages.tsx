import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Main } from '@/components/layout/main'
import { ConkerAvatar } from './conker-avatar'
import { conkerEmotionPack } from './conker-emotions'
import { DomainShell } from './domain-shell'
import { AgentGateHeader } from './page-header'

export function CompanionPage() {
  return (
    <>
      <AgentGateHeader title='Companion' eyebrow='Conker Journal' />
      <Main>
        <section className='grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]'>
          <Card className='overflow-hidden'>
            <CardHeader className='border-b bg-muted/10'>
              <CardTitle className='flex items-center gap-3 text-base'>
                <ConkerAvatar className='size-14' emotion='smug' />
                <span>Conker</span>
                <Badge variant='secondary'>main companion</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 p-5 text-sm text-muted-foreground'>
              <p>
                Your local-first chief companion. Avatar state is a small, local
                emotion package only; it does not enable voice, camera, live
                calls, or appearance/theme controls.
              </p>
              <div className='grid grid-cols-2 gap-2'>
                {conkerEmotionPack.map((emotion) => (
                  <div
                    key={emotion.id}
                    className='flex items-center gap-2 rounded-lg border bg-card p-2'
                  >
                    <ConkerAvatar className='size-8' emotion={emotion.id} />
                    <span className='text-xs text-foreground'>
                      {emotion.label}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Companion workspace</CardTitle>
            </CardHeader>
            <CardContent className='space-y-3 text-sm text-muted-foreground'>
              <p>
                This space will collect proactive findings, completed work, and
                owner-gated requests. Current operational routes remain in
                Chats, Approvals, Jobs, Apps, Memory, Capabilities, and System.
              </p>
              <p>
                Source: AgentGate local profile + runtime metadata. No fake live
                journal entries are generated.
              </p>
            </CardContent>
          </Card>
        </section>
      </Main>
    </>
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
