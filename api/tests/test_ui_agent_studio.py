from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def test_agent_studio_uses_one_screen_per_step_with_persistent_preview():
    studio = read('dashboard/src/features/agentgate/character.tsx')
    layout = read('dashboard/src/components/layout/authenticated-layout.tsx')
    normalized = ' '.join(studio.split())
    assert 'Agent Studio' in studio
    assert "'Identity', 'Appearance', 'Purpose', 'Behavior', 'Model', 'Tools', 'Skills', 'Memory', 'Autonomy', 'Output', 'Review'" in normalized
    assert 'preview' in studio
    assert 'Main 2D profile picture' in studio
    assert 'Emotion pictures' in studio
    assert 'appearance' in studio
    assert "putAgentGate('/api/character'" in studio
    assert "location.pathname === '/character'" in layout
    assert "location.pathname === '/settings/character'" in layout
    assert 'SidebarProvider' in layout
    assert "disabled={save.isPending || !form.name.trim()}" in normalized
    assert "value={form.reasoning_level}" in normalized
    assert 'Save draft' not in studio


def test_agent_studio_does_not_render_3d_or_fake_profile_defaults():
    studio = read('dashboard/src/features/agentgate/character.tsx')
    assert '3D' not in studio
    assert 'canvas' not in studio.lower()
    assert 'Unknown' in studio
    assert 'Agent draft profile' in studio
    assert 'No default appearance' not in studio
    assert 'URL.revokeObjectURL' in studio
