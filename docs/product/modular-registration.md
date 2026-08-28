# Modular registration and missing-data recovery

## Purpose

AgentGate setup is a capability-driven registration system, not a single disposable wizard. Each piece of owner-controlled data has one reusable setup screen. First installation composes those screens into a sequence; later, opening a capability whose required data is absent opens only that capability's setup screen.

## Product principles

- AgentGate behaves like Linux: expose valid choices, dependencies, sources, and consequences; do not force one vendor, model, Companion personality, or workflow.
- The unauthenticated browser never receives dashboard, memory, system, agent, or tool data. First-run password setup uses product-shaped setup chrome but grants a real session before authenticated screens render.
- Required steps block only the capability that depends on them.
- Optional steps may be explicitly deferred. Deferred is not configured.
- No default Conker, mascot, model route, provider, tool permission, or hidden prompt is created.
- Missing-data recovery routes to the specific setup screen, never restarts the entire sequence.

## Setup inventory

| Step | Data | Requirement | Source | Deferral |
|---|---|---|---|---|
| Owner password | Password + confirmation, minimum 12 characters | Required for dashboard session unless a server admin key already owns authentication | `owner_config` verifier or server auth config | Never |
| Owner identity | Display name and local username | Required after authentication | AgentGate local `owner_profile` | Never |
| Companion | Name, owner address name, mode, personality, boundaries | Required only for Companion capability; recommended during first setup | AgentGate local `character_profile` | Allowed |
| Model route | Source-visible provider/model choices | Required only when a selected runtime capability requires it | Pi adapter metadata | Allowed until a real source exists |
| Providers, tools, skills, apps | Module-specific configuration | Optional | Owning Gate contracts | Allowed |

Appearance, audio, voice, camera, avatars, Live2D, and heavy local model installation are outside the current MVP setup scope.

## Flow

1. `password`: first-run owner gate creates a server-side verifier and session.
2. `identity`: authenticated setup screen stores display name and local username.
3. `companion`: create a Companion or explicitly continue without one.
4. `complete`: enter Command. Optional deferred modules remain visible as deferred.

The setup overview is always available and lists `configured`, `missing`, `deferred`, `blocked`, or `unavailable` per step.

## Missing-data routing

- Missing owner identity redirects authenticated navigation to `/setup/identity`.
- Opening Companion with no profile routes to `/setup/companion` even if Companion was previously deferred.
- Saving a step invalidates setup status and returns to the next dependency.
- Other optional modules remain ordinary routes until a live contract defines their setup dependencies.

## API contract

Authenticated browser-safe endpoints:

- `GET /api/setup/status`: safe setup step metadata only; no verifier, credential, prompt, provider URL, or environment value.
- `GET /api/owner/profile`: display name, local username, configured flag, update timestamp.
- `PUT /api/owner/profile`: validate and save display name and local username.
- `POST /api/setup/steps/companion/defer`: records explicit deferral; does not create a Companion.

Existing endpoints remain authoritative for password bootstrap and Companion persistence.

## States

Every step supports loading, configured, missing, deferred, blocked, unavailable, and validation-error presentation where relevant. Setup must never infer success from intended configuration.

## Security and privacy

- Passwords are posted only to authentication endpoints and never returned.
- The browser receives no password verifier.
- Owner identity is local product metadata, not an OS account or provider identity.
- Companion personality never grants tools, permissions, or external effects.
- Provider secrets remain server-side and are not part of these screens.

## Acceptance criteria

- A database with no owner password shows password setup rather than a broken login.
- Successful password creation issues a session and proceeds to owner identity.
- Missing owner identity opens only identity setup.
- Companion may be created or deferred; deferral does not create a profile.
- Opening Companion while missing opens only Companion setup.
- Returning users with complete required data enter Command directly.
- Desktop and mobile setup screens have keyboard labels, loading/error states, no horizontal overflow, and no fake connected/healthy claims.
