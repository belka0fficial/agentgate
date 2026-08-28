from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text()


def test_global_appbar_is_full_width_and_search_dominant():
    header = read('dashboard/src/features/agentgate/page-header.tsx')

    assert 'flex-1' in header
    assert 'Search AgentGate' in header
    assert "aria-label='Open chats'" in header
    assert "aria-label='Open approvals'" in header
    assert "aria-label='Open Command'" in header
    assert "<Link to='/' aria-label='Open Command'" in header
    assert '<LayoutDashboard />' in header
    assert 'border-b' not in header
    assert 'max-w-[42vw]' not in header
    assert '@7xl/content:max-w-7xl' not in header
    assert '<h1' not in header
    assert "className='w-full'" in header
    assert 'aria-label={`${currentTitle}: ${currentContext} application controls`}' in header
    assert "className='sticky top-0 z-30 bg-background/95" in header
    assert "className='size-9 shrink-0'" in header
    assert header.index("aria-label='Open Command'") < header.index('<ToolbarSearch')


def test_settings_parent_owns_the_persistent_appbar():
    settings = read('dashboard/src/features/settings/index.tsx')
    appearance = read('dashboard/src/routes/_authenticated/settings/appearance.tsx')
    display = read('dashboard/src/routes/_authenticated/settings/display.tsx')

    assert 'AgentGateHeader' in settings
    assert '<AgentGateHeader' not in appearance
    assert '<AgentGateHeader' not in display
