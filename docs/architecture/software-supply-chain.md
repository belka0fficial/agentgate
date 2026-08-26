# Software Supply Chain Architecture

## Purpose

AgentGate must understand the software it depends on: operating-system packages, container images, language libraries, MCP servers, local model/runtime binaries, and dependencies inside hosted Apps.

This is a **System** domain, not a generic Tool and not an unrestricted package manager.

Owner-facing location:

```text
System
└── Software Supply Chain
    ├── Overview
    ├── Components
    ├── Vulnerabilities
    ├── Licenses
    ├── Updates
    └── Scans
```

## Ownership

```text
SystemGate
  -> observes packages, lockfiles, images, SBOMs, vulnerabilities, licenses
  -> exposes bounded read-only metadata

AgentGate
  -> presents inventory, risk, freshness, update proposals, test evidence
  -> stores owner review state and opaque artifact references

ToolGate
  -> owns any approved install, update, rebuild, restart, or rollback action
  -> binds approval to the exact repository/image/version/digest/arguments

Repository CI/build harness
  -> creates update branch/image
  -> runs tests/build/contracts/E2E
  -> produces immutable evidence
```

AgentGate must never send package-manager credentials, Docker control, repository write tokens, or arbitrary shell commands to the browser.

## Component classes

- Host OS packages and security updates.
- Container base-image and application packages.
- Container image tags and immutable digests.
- JavaScript packages from npm/pnpm/yarn lockfiles.
- Python packages from uv/pip/Poetry lockfiles.
- Go modules, Rust crates, JVM/.NET dependencies when an App uses them.
- MCP server packages.
- Model/runtime binaries and downloaded model artifacts.
- Hosted App dependencies and App manifest versions.
- Direct and transitive dependencies.

## Normalized component record

A component should include:

- stable component ID and Package URL/PURL when available;
- ecosystem, name, version, direct/transitive status;
- owning project, container, or hosted App;
- lockfile, image digest, SBOM, and provenance references;
- license, license confidence, and policy result;
- vulnerability IDs, severity, fix availability, and risk context;
- latest known version and patch/minor/major classification;
- first and last observed timestamps;
- scanner name/version and checked timestamp;
- lifecycle status: current, outdated, vulnerable, unsupported, unpinned, ignored-with-reason, unknown;
- responsible owner, update policy, test harness, deployment, and rollback reference.

Raw host paths and unrestricted SBOM payloads remain server-side. The browser receives bounded fields and opaque artifact identifiers.

## Discovery and scanning

Reference candidates:

- Trivy — first broad spike for packages, vulnerabilities, secrets, licenses, repositories, filesystems, and images.
- Syft — normalized CycloneDX/SPDX SBOM generation.
- Grype — vulnerability scanning over images/filesystems/SBOMs.
- OSV-Scanner — lockfile and remediation-focused vulnerability analysis.
- OWASP Dependency-Track — data/UX reference; defer running the full platform unless native inventory becomes insufficient.
- OSS Review Toolkit — licensing/compliance reference for later product distribution.

Do not permanently run every scanner. Benchmark the same AgentGate source tree and image, compare coverage/resource cost/output quality, then select the smallest sufficient combination.

## Safe update lifecycle

```text
inventory scan
  -> candidate discovered
  -> release/license/security research
  -> compatibility and risk classification
  -> isolated branch/image rebuild
  -> lockfile and provenance update
  -> unit/lint/build/contract/E2E tests
  -> new SBOM and vulnerability scan
  -> before/after diff
  -> owner approval
  -> reviewed/canary deployment
  -> health verification
  -> promote or rollback
```

### Initial update policy

- Patch updates may be automatically researched and tested, never silently deployed.
- Minor updates require compatibility evidence and owner approval.
- Major updates require explicit migration review.
- Security emergencies receive urgent presentation but still require exact binding, verification, and rollback.
- Renovate or Dependabot may create update branches/PRs after the test harness exists.
- Blind auto-merge is forbidden for AgentGate, gates, generated Apps, Agents, Skills, Tools, Jobs, Flows, and ToolGate Automations.

## UX requirements

### Overview

- total components by ecosystem/source;
- direct versus transitive counts;
- vulnerable/unsupported/unpinned counts;
- stale scanner evidence;
- pending update proposals;
- scan health.

### Components

Search/filter by project, App, container, ecosystem, directness, license, status, and version.

### Vulnerabilities

Show severity, affected component, source, fix availability, exploitability context, and whether the dependency is direct or transitive. Do not imply every CVE is exploitable.

### Licenses

Show declared/detected license, confidence, policy, attribution requirement, and unknown conflicts. Commercial distribution requires a separate legal review.

### Updates

Show exact before/after version, release notes/source, compatibility risk, tests, SBOM/vulnerability delta, approval, deployment, and rollback.

### Scans

Show scanner/version, target, start/end, duration, resource cost, artifact reference, warnings, and freshness.

## Acceptance criteria

- Inventory covers AgentGate source, production image, and one hosted App fixture.
- Every visible component has source and checked time.
- Missing scanners produce `unknown`/`blocked`, not empty-success.
- Update execution cannot occur from SystemGate.
- An approval is bound to exact source/version/digest and becomes invalid if the candidate changes.
- Failed tests or health checks block promotion and preserve rollback.
- Browser bundles contain no admin keys, package credentials, private registry credentials, host paths, or Docker socket information.
