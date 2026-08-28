from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def test_agent_studio_uses_one_screen_per_step_with_persistent_preview():
    studio = read('dashboard/src/features/agentgate/character.tsx')
    layout = read('dashboard/src/components/layout/authenticated-layout.tsx')
    normalized = ' '.join(studio.split())
    assert 'Agent Studio' in studio
    assert "'Identity', 'Appearance', 'Behavior', 'Character', 'Model', 'Tools', 'Skills', 'Review'" in normalized
    assert 'preview' in studio
    assert 'Agent pictures' in studio
    for image_slot in ('Profile', 'Neutral', 'Happy', 'Thinking', 'Annoyed', 'Tired'):
        assert image_slot in studio
    assert 'Purpose' in studio
    assert 'backstory' in studio
    for behavior_question in ('How should this Agent communicate?', 'How should this Agent make decisions?', 'What should it do when uncertain?', 'How much detail should it provide?', 'What should it avoid doing?'):
        assert behavior_question in studio
    assert 'Memory for this Agent' in studio
    assert "putAgentGate('/api/character'" in studio
    assert "location.pathname === '/character'" in layout
    assert "location.pathname === '/settings/character'" in layout
    assert 'SidebarProvider' in layout
    assert 'save.isPending' in studio
    assert "current === 'Review'" in normalized
    assert '!form.name.trim()' in normalized
    assert 'value={form.reasoning_level}' in normalized
    assert 'Save draft' not in studio
    assert 'setCurrent(steps[index + 1])' in normalized
    assert "current === 'Autonomy'" not in studio
    assert "current === 'Output'" not in studio


def test_agent_studio_does_not_render_3d_or_fake_profile_defaults():
    studio = read('dashboard/src/features/agentgate/character.tsx')
    assert '3D' not in studio
    assert 'canvas' not in studio.lower()
    assert 'Unknown' in studio
    assert 'Agent draft profile' in studio
    assert 'No default appearance' not in studio
    assert 'URL.revokeObjectURL' in studio
