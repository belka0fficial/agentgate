from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_sidebar_places_search_companion_and_normal_footer_utilities():
    sidebar = (ROOT / 'dashboard/src/components/layout/app-sidebar.tsx').read_text()

    header = sidebar[sidebar.index('<SidebarHeader'):sidebar.index('<SidebarContent>')]
    utility = sidebar[sidebar.index('function SidebarUtilityBlock()'):sidebar.index('function SystemInfoPanel()')]

    assert header.index('<SidebarSearch />') < header.index('<SidebarCompanion />')
    assert "aria-label='Open search'" in header or "aria-label='Open search'" in sidebar
    assert "aria-label='Open companion'" in sidebar
    assert "to='/companion'" in sidebar
    assert '<SystemInfoPanel />' in sidebar
    assert "to='/activity'" in utility
    assert "to='/settings/gateways'" in utility
    assert "<span>Activity</span>" in utility
    assert "<span>Settings</span>" in utility
    assert 'group-data-[collapsible=icon]:hidden' in utility
    assert 'SidebarTrigger' not in utility
    assert '<CircleDot />' not in utility
