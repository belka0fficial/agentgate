from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_sidebar_places_companion_under_brand_and_status_with_utilities():
    sidebar = (ROOT / 'dashboard/src/components/layout/app-sidebar.tsx').read_text()

    brand = sidebar.index('<SidebarBrand />')
    content = sidebar.index('<SidebarContent>')
    footer = sidebar.index('<SidebarFooter')
    utility = sidebar.index('<SidebarUtilityBlock />', footer)

    assert brand < content < footer < utility
    assert "aria-label='Open companion'" in sidebar
    assert "to='/companion'" in sidebar
    assert '<SystemInfoPanel />' in sidebar
    assert "aria-label='Settings'" in sidebar
    assert "aria-label='Toggle sidebar'" in sidebar
    assert 'status.label' in sidebar
