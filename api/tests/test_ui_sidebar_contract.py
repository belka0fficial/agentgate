from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_sidebar_places_companion_under_brand_and_activity_with_utilities():
    sidebar = (ROOT / 'dashboard/src/components/layout/app-sidebar.tsx').read_text()

    brand = sidebar.index('<SidebarBrand />')
    content = sidebar.index('<SidebarContent>')
    footer = sidebar.index('<SidebarFooter')
    utility = sidebar.index('<SidebarUtilityBlock />', footer)
    brand_definition = sidebar[
        sidebar.index('function SidebarBrand()') : sidebar.index('function SidebarUtilityBlock()')
    ]
    utility_definition = sidebar[
        sidebar.index('function SidebarUtilityBlock()') : sidebar.index('function SystemInfoPanel()')
    ]

    assert brand < content < footer < utility
    assert "aria-label='Open companion'" in brand_definition
    assert "to='/companion'" in brand_definition
    assert '<SystemInfoPanel />' in brand_definition
    assert '<SystemInfoPanel />' not in utility_definition
    assert "to='/activity'" in utility_definition
    assert '<CircleDot />' in utility_definition
    assert 'toneClass' in utility_definition
    assert "aria-label='Settings'" in utility_definition
    assert "aria-label='Toggle sidebar'" in utility_definition
