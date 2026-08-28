from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_activity_route_is_source_bound_and_never_invents_events():
    route = ROOT / 'dashboard/src/routes/_authenticated/activity.tsx'
    page = ROOT / 'dashboard/src/features/agentgate/activity.tsx'

    assert route.exists()
    assert page.exists()
    source = page.read_text()
    normalized = ' '.join(source.split())
    assert "getAgentGate<ActivityResponse>('/api/home')" in source
    assert 'Array.isArray(query.data?.activity)' in source
    assert 'No activity reported' in source
    assert 'raw prompts' in normalized
    assert "to='/activity'" in (
        ROOT / 'dashboard/src/components/layout/app-sidebar.tsx'
    ).read_text()
