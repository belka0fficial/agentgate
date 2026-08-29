from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def test_theme_studio_uses_shadcn_tokens_and_safe_imports():
    studio = read('dashboard/src/features/settings/theme-studio.tsx')
    parser = read('dashboard/src/lib/theme-import.ts')
    provider = read('dashboard/src/context/theme-provider.tsx')
    route = read('dashboard/src/routes/_authenticated/settings/appearance.tsx')

    assert 'tweakcn.com' in studio
    assert 'Import palette URL' in studio
    assert 'Paste styles.css or layout.tsx' in studio
    assert 'Accent color' in studio
    assert 'Preview changes' in studio
    assert 'Apply theme' in studio
    assert 'Reset theme' in studio
    assert 'credentials: \'omit\'' in studio
    assert 'url.hostname' in studio
    assert 'parseThemeInput' in parser
    assert 'sanitizeThemeTokens' in parser
    assert 'ALLOWED_THEME_KEYS' in parser
    assert 'dangerouslySetInnerHTML' not in parser
    assert 'setCustomTheme' in provider
    assert 'previewCustomTheme' in provider
    assert 'resetCustomTheme' in provider
    assert 'ThemeStudio' in route
