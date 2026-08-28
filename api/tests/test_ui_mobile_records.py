from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MOBILE_RECORD_SURFACES = [
    'dashboard/src/features/agentgate/chats.tsx',
    'dashboard/src/features/agentgate/approvals.tsx',
    'dashboard/src/features/agentgate/automations.tsx',
    'dashboard/src/features/apps/index.tsx',
]


def test_priority_operational_tables_have_semantic_mobile_record_views():
    missing: list[str] = []
    for relative_path in MOBILE_RECORD_SURFACES:
        content = (ROOT / relative_path).read_text()
        if "data-mobile-records" not in content:
            missing.append(f'{relative_path}: mobile record view')
        if "hidden md:block" not in content:
            missing.append(f'{relative_path}: desktop table breakpoint')

    assert missing == []


def test_mobile_action_records_preserve_informed_decision_context():
    approvals = (ROOT / 'dashboard/src/features/agentgate/approvals.tsx').read_text()
    jobs = (ROOT / 'dashboard/src/features/agentgate/automations.tsx').read_text()

    assert approvals.count('Payload withheld') >= 2
    assert jobs.count('safeJobHistoryLabel(item)') >= 2
    assert jobs.count('item.output?.raw_withheld') >= 2
    assert jobs.count('item.source_ref') >= 2
    assert jobs.count("item.kind ?? 'cron'") >= 2
    assert jobs.count("item.last_run ?? '—'") >= 2
