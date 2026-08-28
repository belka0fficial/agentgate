from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def test_modular_setup_has_reusable_per_data_routes():
    setup = read('dashboard/src/features/agentgate/setup.tsx')
    layout = read('dashboard/src/components/layout/authenticated-layout.tsx')
    owner_gate = read('dashboard/src/features/agentgate/owner-gate.tsx')

    for route in (
        'dashboard/src/routes/_authenticated/setup/index.tsx',
        'dashboard/src/routes/_authenticated/setup/identity.tsx',
        'dashboard/src/routes/_authenticated/setup/companion.tsx',
    ):
        assert (ROOT / route).exists()

    assert "getAgentGate<SetupStatus>('/api/setup/status')" in setup
    assert "putAgentGate('/api/owner/profile'" in setup
    assert "postAgentGate('/api/setup/steps/companion/defer')" in setup
    assert "putAgentGate('/api/character'" in setup
    assert "background: ''" in setup
    assert 'Continue without a Companion' in setup
    assert 'SetupRequirementGate' in layout
    assert 'SetupRequirementRedirect' not in layout
    assert 'setup.isLoading' in layout
    assert 'setup.isError' in layout
    assert "to='/setup/identity'" in layout
    assert "to='/setup/companion'" in layout
    assert "currentPath === '/companion'" in layout
    assert 'First run setup' in owner_gate
    assert 'AgentGate setup' in owner_gate


def test_setup_copy_preserves_choice_truthful_status_and_errors():
    setup = read('dashboard/src/features/agentgate/setup.tsx')
    normalized = ' '.join(setup.split())
    assert 'Required for dashboard access' in normalized
    assert 'Optional module' in normalized
    assert 'Deferred is not configured' in normalized
    assert 'No default Companion, model, provider, or tool permission is created.' in normalized
    assert 'Could not load setup status' in normalized
    assert 'Could not load owner identity' in normalized
    assert 'Could not defer Companion setup' in normalized
    assert 'Retry' in normalized
