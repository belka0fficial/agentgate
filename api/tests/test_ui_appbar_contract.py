from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text()


def test_global_appbar_is_context_bar_and_search_is_sidebar_owned():
    header = read('dashboard/src/features/agentgate/page-header.tsx')
    sidebar = read('dashboard/src/components/layout/app-sidebar.tsx')

    assert 'Breadcrumb' in header
    assert 'SidebarTrigger' in header
    assert 'Search AgentGate' not in header
    assert '<ToolbarSearch' not in header
    assert "aria-label='Toggle navigation'" in header
    assert "className='sticky top-0 z-30 border-b bg-background/95" in header
    assert 'Search AgentGate' in sidebar
    assert "aria-label='Open search'" in sidebar


def test_settings_parent_owns_the_persistent_appbar():
    settings = read('dashboard/src/features/settings/index.tsx')
    appearance = read('dashboard/src/routes/_authenticated/settings/appearance.tsx')
    display = read('dashboard/src/routes/_authenticated/settings/display.tsx')

    assert 'AgentGateHeader' in settings
    assert '<AgentGateHeader' not in appearance
    assert '<AgentGateHeader' not in display
