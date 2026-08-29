from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def test_sidebar_owns_search_and_separates_product_domains():
    sidebar = read('dashboard/src/components/layout/app-sidebar.tsx')
    data = read('dashboard/src/components/layout/data/sidebar-data.ts')
    assert 'Search AgentGate' in sidebar
    assert "aria-label='Open search'" in sidebar
    for group in ('Command', 'Agents', 'Operations', 'Knowledge', 'Workspace', 'System'):
        assert f"title: '{group}'" in data
    assert "title: 'Capabilities'" in data
    assert "title: 'Memory'" in data


def test_appbar_is_context_bar_not_a_second_global_search():
    header = read('dashboard/src/features/agentgate/page-header.tsx')
    assert 'Breadcrumb' in header
    assert 'SidebarTrigger' in header
    assert 'Search AgentGate' not in header
    assert '<ToolbarSearch' not in header
    assert '<LayoutDashboard />' not in header
    assert 'border-b' in header
    assert 'currentContext' in header
