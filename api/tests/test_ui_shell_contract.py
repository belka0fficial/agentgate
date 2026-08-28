from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text()


def test_product_header_has_mobile_navigation_and_no_fake_global_actions():
    header = read('dashboard/src/features/agentgate/page-header.tsx')

    assert 'SidebarTrigger' in header
    assert 'md:hidden' in header
    assert 'window.location.reload' not in header
    assert 'window.print' not in header
    assert "label: 'New job'" not in header
    assert "label: 'Run now'" not in header
    assert "label: 'Export view'" not in header


def test_command_palette_labels_navigation_as_navigation():
    menu = read('dashboard/src/components/command-menu.tsx')

    assert "title='Open automations'" in menu
    assert "title='Open Agent Studio'" in menu
    assert "title='Open system status'" in menu
    assert "title='New automation'" not in menu
    assert "title='New persona'" not in menu
    assert "title='Run audit'" not in menu
