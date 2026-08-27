from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

FORBIDDEN_LAYOUT_PATTERNS = {
    "dashboard/src/features/settings/components/content-section.tsx": [
        "lg:max-w-xl",
    ],
    "dashboard/src/features/settings/gateways/index.tsx": [
        "lg:max-w-5xl",
    ],
    "dashboard/src/features/settings/profile/index.tsx": [
        "max-w-6xl",
        "max-w-5xl",
        "max-w-4xl",
        "max-w-3xl",
    ],
    "dashboard/src/features/agentgate/character.tsx": [
        "max-w-5xl space-y-8",
        "max-w-3xl space-y-2",
    ],
    "dashboard/src/features/agentgate/domain-shell.tsx": [
        "max-w-3xl",
    ],
    "dashboard/src/features/agentgate/domain-pages.tsx": [
        "max-w-4xl space-y-6",
        "max-w-3xl space-y-2",
        "max-w-4xl text-sm leading-6",
    ],
}


def test_operational_screens_do_not_restore_left_column_width_caps():
    offenders: list[str] = []
    for relative_path, patterns in FORBIDDEN_LAYOUT_PATTERNS.items():
        content = (ROOT / relative_path).read_text()
        for pattern in patterns:
            if pattern in content:
                offenders.append(f"{relative_path}: {pattern}")

    assert offenders == []
