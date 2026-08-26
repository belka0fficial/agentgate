#!/usr/bin/env python3
"""Scan browser/static artifacts for forbidden AgentGate boundary content.

This is intentionally deterministic and dependency-free so it can run in release
checks before deployment. It is not a replacement for a full secret scanner; it
catches AgentGate-specific classes that must never reach browser bundles.
"""
from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path

DEFAULT_TARGETS = ("dashboard/dist",)
TEXT_EXTENSIONS = {
    ".css",
    ".html",
    ".js",
    ".json",
    ".map",
    ".mjs",
    ".svg",
    ".txt",
    ".wasm.map",
}
SKIP_DIRS = {".git", ".venv", "node_modules", "coverage", ".pytest_cache", "__pycache__"}
MAX_FILE_BYTES = 5_000_000


@dataclass(frozen=True)
class Rule:
    name: str
    pattern: re.Pattern[str]
    description: str


RULES: tuple[Rule, ...] = (
    Rule(
        "admin-key-name",
        re.compile(r"(?:^|[^A-Za-z0-9])(AGENTGATE_ADMIN_KEY|AGENTGATE_MCP_KEY|TOOLGATE_ADMIN_KEY|MEMORYGATE_ADMIN_KEY|SYSTEMGATE_ADMIN_KEY|BRAIN_API_KEY)(?:$|[^A-Za-z0-9])"),
        "server/admin key name",
    ),
    Rule(
        "generic-api-key-assignment",
        re.compile(r"\b(?:OPENAI|ANTHROPIC|MISTRAL|GOOGLE|TOOLGATE|MEMORYGATE|SYSTEMGATE|AGENTGATE)[A-Z0-9_]*(?:API|ADMIN)?_?KEY\s*[:=]\s*['\"]?[A-Za-z0-9_./-]{8,}", re.IGNORECASE),
        "generic API key assignment",
    ),
    Rule(
        "secret-shaped-token",
        re.compile(r"\b(sk-(?:proj-)?[A-Za-z0-9_-]{8,}|ghp_[A-Za-z0-9_]{16,}|github_pat_[A-Za-z0-9_]{16,}|glpat-[A-Za-z0-9_-]{12,}|hf_[A-Za-z0-9_-]{12,}|xox[baprs]-[A-Za-z0-9-]{12,}|AKIA[0-9A-Z]{12,}|AIza[0-9A-Za-z_-]{10,}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b"),
        "secret-shaped token",
    ),
    Rule(
        "browser-auth-header",
        re.compile(r"\b(Authorization\s*:|Bearer\s+[A-Za-z0-9._~+/-]+|X-ToolGate-Key|X-MemoryGate-Key|X-SystemGate-Key)\b", re.IGNORECASE),
        "browser-visible auth header",
    ),
    Rule(
        "provider-upstream-url",
        re.compile(r"\b(api\.openai\.com|api\.anthropic\.com|api\.mistral\.ai|generativelanguage\.googleapis\.com|chatgpt\.com/backend-api|openrouter\.ai/api)\b", re.IGNORECASE),
        "provider upstream URL",
    ),
    Rule(
        "host-path-or-socket",
        re.compile(r"(/home/[A-Za-z0-9._/-]+|/Users/[A-Za-z0-9._/-]+|C:\\Users\\[A-Za-z0-9._\\-]+|/var/run/docker\.sock|file:///[A-Za-z0-9._:/-]+)", re.IGNORECASE),
        "host path or local socket",
    ),
    Rule(
        "hidden-prompt-label",
        re.compile(r"\b(raw_owner_prompt|system prompt|hidden prompt|private owner|auth_headers|raw_args)\b", re.IGNORECASE),
        "hidden prompt/raw argument label",
    ),
)


@dataclass(frozen=True)
class Finding:
    path: Path
    line: int
    column: int
    rule: str
    description: str
    excerpt: str


def iter_files(targets: list[Path]) -> list[Path]:
    files: list[Path] = []
    seen: set[Path] = set()
    for target in targets:
        if not target.exists():
            continue
        if target.is_file():
            if is_text_candidate(target):
                resolved = target.resolve()
                if resolved not in seen:
                    seen.add(resolved)
                    files.append(target)
            continue
        for child in target.rglob("*"):
            if any(part in SKIP_DIRS for part in child.parts):
                continue
            if child.is_file() and is_text_candidate(child):
                resolved = child.resolve()
                if resolved not in seen:
                    seen.add(resolved)
                    files.append(child)
    return sorted(files)


def is_text_candidate(path: Path) -> bool:
    if path.suffix in TEXT_EXTENSIONS:
        return True
    return any(str(path).endswith(ext) for ext in TEXT_EXTENSIONS)


def scan_file(path: Path, *, strict: bool = False) -> list[Finding]:
    try:
        size = path.stat().st_size
    except OSError as exc:
        return [Finding(path, 1, 1, "unreadable-file", f"file could not be scanned: {type(exc).__name__}", "scan refused")]
    if not is_text_candidate(path):
        return [Finding(path, 1, 1, "unscannable-file", "file type is not a supported text artifact", "scan refused")] if strict else []
    if size > MAX_FILE_BYTES:
        return [Finding(path, 1, 1, "oversized-file", "file exceeds maximum scan size", "scan refused")]
    try:
        text = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return [Finding(path, 1, 1, "unreadable-file", f"file could not be scanned: {type(exc).__name__}", "scan refused")]
    findings: list[Finding] = []
    for line_number, line in enumerate(text.splitlines(), start=1):
        for rule in RULES:
            for match in rule.pattern.finditer(line):
                findings.append(Finding(path, line_number, match.start() + 1, rule.name, rule.description, "[redacted]"))
    return findings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Scan AgentGate browser/static artifacts for forbidden secret-boundary content.")
    parser.add_argument("targets", nargs="*", help="Files or directories to scan. Defaults to dashboard/dist when present.")
    args = parser.parse_args(argv)

    raw_targets = [Path(item) for item in (args.targets or DEFAULT_TARGETS)]
    target_map: dict[Path, Path] = {}
    for target in raw_targets:
        target_map.setdefault(target.resolve(), target)
    targets = [target_map[key] for key in sorted(target_map)]
    missing = [path for path in targets if not path.exists()]
    if missing:
        print(f"AgentGate static boundary scan: {len(missing)} target(s) missing")
        return 2
    files = iter_files(targets)
    findings = [finding for path in files for finding in scan_file(path, strict=False)]
    explicit_paths = {target.resolve() for target in targets if target.is_file()}
    findings = [finding for finding in findings if finding.path.resolve() not in explicit_paths]
    findings.extend(finding for target in targets if target.is_file() for finding in scan_file(target, strict=True))

    if findings:
        print(f"AgentGate static boundary scan: {len(findings)} findings across {len({finding.path for finding in findings})} files")
        labels: dict[Path, str] = {}
        for index, finding in enumerate(findings, start=1):
            label = labels.setdefault(finding.path.resolve(), f"artifact-{len(labels) + 1}")
            print(f"{label}:{finding.line}:{finding.column}: {finding.rule}: {finding.description}: {finding.excerpt}")
        return 1

    scanned = len(files)
    suffix = ""
    print(f"AgentGate static boundary scan: 0 findings across {scanned} files{suffix}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
