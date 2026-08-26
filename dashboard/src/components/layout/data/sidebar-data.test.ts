import { describe, expect, it } from 'vitest'
import { sidebarData } from './sidebar-data'

function navTitles() {
  return sidebarData.navGroups.flatMap((group) =>
    group.items.map((item) => item.title)
  )
}

function navUrls() {
  return sidebarData.navGroups.flatMap((group) =>
    group.items.flatMap((item) => {
      if ('items' in item && item.items) {
        return item.items.map((child) => child.url)
      }
      return 'url' in item ? [item.url] : []
    })
  )
}

describe('AgentGate sidebar information architecture', () => {
  it('uses the text-first AgentGate destinations without legacy Suggestions or merged Automations', () => {
    const titles = navTitles()
    const urls = navUrls()

    expect(titles).toEqual([
      'Companion',
      'Chats',
      'Approvals',
      'Command',
      'Orchestration',
      'Workforce',
      'Jobs',
      'Capabilities',
      'Memory',
      'Apps',
      'System',
    ])
    expect(titles).not.toContain('Suggestions')
    expect(titles).not.toContain('Automations')
    expect(titles).not.toContain('Character')
    expect(urls).toEqual([
      '/companion',
      '/chats',
      '/approvals',
      '/',
      '/orchestration',
      '/workforce',
      '/jobs',
      '/capabilities',
      '/memory',
      '/apps/',
      '/system',
    ])
    expect(urls).not.toContain('/suggestions')
    expect(urls).not.toContain('/automations')
  })
})
