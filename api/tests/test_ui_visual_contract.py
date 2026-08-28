from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(relative_path: str) -> str:
    return (ROOT / relative_path).read_text()


def test_product_shell_uses_local_geist_without_google_font_runtime_dependency():
    html = read('dashboard/index.html')
    package_json = read('dashboard/package.json')
    theme = read('dashboard/src/styles/theme.css')

    assert 'fonts.googleapis.com' not in html
    assert '@fontsource-variable/geist' in package_json
    assert '@fontsource-variable/geist-mono' in package_json
    assert '--font-geist' in theme
    assert '--font-geist-mono' in theme


def test_dark_product_theme_has_two_explicit_surfaces_and_visible_focus():
    theme = read('dashboard/src/styles/theme.css')
    styles = read('dashboard/src/styles/index.css')

    assert '--surface-1:' in theme
    assert '--surface-2:' in theme
    assert '--focus:' in theme
    assert ':focus-visible' in styles
    assert 'prefers-reduced-motion: reduce' in styles


def test_shared_product_primitives_keep_compact_geist_geometry():
    button = read('dashboard/src/components/ui/button.tsx')
    card = read('dashboard/src/components/ui/card.tsx')
    input_source = read('dashboard/src/components/ui/input.tsx')

    assert "rounded-md" in button
    assert "rounded-xl" not in card
    assert "shadow-sm" not in card
    assert "h-9" in input_source
