from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text()


def test_global_appbar_keeps_long_meta_search_and_truthful_quick_actions():
    header = read('dashboard/src/features/agentgate/page-header.tsx')

    assert "flex-1" in header
    assert 'Search AgentGate' in header
    assert "aria-label='Open chats'" in header
    assert "aria-label='Open approvals'" in header
    assert 'max-w-[42vw]' not in header
    assert "overflow-hidden sm:max-w-none" not in header


def test_settings_parent_owns_the_persistent_appbar():
    settings = read('dashboard/src/features/settings/index.tsx')
    appearance = read('dashboard/src/routes/_authenticated/settings/appearance.tsx')
    display = read('dashboard/src/routes/_authenticated/settings/display.tsx')

    assert 'AgentGateHeader' in settings
    assert '<AgentGateHeader' not in appearance
    assert '<AgentGateHeader' not in display
