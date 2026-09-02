# nestjs-google-pubsub-cqrs

## Purpose

An owned (not third-party) NestJS library that wires `@nestjs/cqrs`'s `EventBus` to Google
Pub/Sub, so multiple NestJS services can share one distributed event bus instead of each running
CQRS in isolation. Ships two things:

- The npm package `nestjs-google-pubsub-cqrs` (`PubSubCqrsModule`, `PubSubService`,
  `PubSubGlobalBusListener` + E2E test helpers) — the code under `src/` and `index.ts`.
- A companion Docker image, `myownsumm/nestjs-google-pubsub-emulator` (built from
  `docker-image/`) — a local Pub/Sub emulator with a real init/health-check flow, used as the
  `pubsub-emulator` service in consuming projects' `docker-compose.yaml` (e.g. u-autonomo's
  `infrastructure/docker-compose.yaml`).

Consumers pin the npm package version in their own `package.json` (e.g.
`"nestjs-google-pubsub-cqrs": "1.2.0"`) and the Docker image by tag in their own compose file —
this repo does not know who consumes it or how; changes here only take effect downstream once a
consumer explicitly bumps its pin.

## How it's used day to day

- `npm test` / `npm run build` / `npm run lint` — standard Jest/tsc/ESLint, run locally, no Docker
  required for the library itself.
- `docker build -t <tag> docker-image/` — builds the emulator image locally without publishing
  anything (useful for verifying a `docker-image/` change before it goes out).
- CI (`.github/workflows/ci.yml`) runs Test & Lint (current Node matrix), Security Audit
  (`npm audit`, both `--audit-level=high` and `--audit-level=moderate --production` — see
  "Keeping CI green" below), and an Integration Test (Event Bus) job on every PR/push to `main`.

## How a change gets published

Two independent publish surfaces — a code change to `src/`/`index.ts` only needs the first;
`docker-image/` changes need the second too.

### 1. npm package (automatic via GitHub Release)

1. Land the change on `main` via a normal PR (branch → PR → CI green → merge; branch protection
   is a **ruleset**, not classic branch protection — see "Repo settings that aren't in code"
   below).
2. Create a GitHub Release with a semver tag, e.g.:
   ```bash
   gh release create v1.3.0 --repo myownsumm/nestjs-google-pubsub-cqrs --target main \
     --title "v1.3.0 — <summary>" --notes "<what changed, verification done, compatibility>"
   ```
3. That `release: published` event triggers the `publish` job in `ci.yml`, which runs
   `npm version <tag> --no-git-tag-version` (so the release tag *is* the version — never bump
   `package.json`'s version by hand) then `npm publish --access public`, authenticated via the
   `NPM_TOKEN` repo secret.
4. A merge to `main` alone (without a Release) **never** publishes — the publish job's `if`
   condition is `github.event_name == 'release' && github.event.action == 'published'`. If
   "Publish to NPM" shows as skipped on a run, that's expected for a plain push; it is not a sign
   the version was wrong.

If `npm publish` fails with `404 Not Found - PUT .../nestjs-google-pubsub-cqrs` (not a version
conflict — the tarball builds and versions fine), `NPM_TOKEN` is invalid/expired/wrong-scope:
generate a new Automation/Publish token at npmjs.com → Access Tokens for this package, then
`gh secret set NPM_TOKEN --repo myownsumm/nestjs-google-pubsub-cqrs`, and re-run just the failed
job (`gh run rerun <run-id> --job <job-id>`) rather than cutting a new release.

### 2. Docker emulator image (manual, needs Docker Hub login — not automated in CI)

```bash
cd docker-image
docker buildx create --name multiarch --use --driver docker-container   # once
docker buildx build --platform linux/amd64,linux/arm64 \
  -t myownsumm/nestjs-google-pubsub-emulator:latest \
  -t myownsumm/nestjs-google-pubsub-emulator:<version> \
  --push .
```

See `docker-image/DOCKER_HUB_PUBLISHING.md` for the full walkthrough. Prefer pushing a specific
version tag alongside (or instead of) `:latest` in consuming projects' compose files — floating
`:latest` defeats reproducibility (this was itself part of what
`.claude/ideas/deterministic-local-pubsub-startup/idea.md` in u-autonomo flagged as a gap when
diagnosing a startup-readiness bug fixed in #15/v1.2.0).

## Repo settings that aren't in code

- **Branch protection on `main` is a repository *ruleset*** (`main to review`, id findable via
  `gh api repos/myownsumm/nestjs-google-pubsub-cqrs/rulesets`), not the classic branch-protection
  API — `gh api repos/.../branches/main/protection` returns 404 even though protection is active.
  It requires 1 approving review and a fixed list of **named** status-check contexts.
- **The required status-check names are hardcoded in the ruleset and do not follow
  `ci.yml`'s matrix automatically.** If `ci.yml`'s `Test & Lint` matrix changes (Node versions
  added/removed), the ruleset's `required_status_checks` must be updated in the same PR/session —
  otherwise a required check name that no longer exists blocks every future merge forever
  (`Expected — Waiting for status to be reported`, never resolves). This bit us updating the
  matrix from `[18.x, 20.x, 22.x]` to `[22.x, 24.x]` in #15 — the merge was blocked until the
  ruleset was patched via:
  ```bash
  gh api --method PUT repos/myownsumm/nestjs-google-pubsub-cqrs/rulesets/<id> --input <json>
  ```
  (fetch current config first with `gh api repos/.../rulesets/<id>`, edit
  `rules[].parameters.required_status_checks`, PUT the whole rules array back — the API has no
  partial-patch for just that list).
- Node engine floor is declared in `package.json`'s `engines.node` and must match the lowest
  Node version in `ci.yml`'s matrix and the `docker-image/Dockerfile` base image — these three
  are not cross-checked by any tooling, keep them in sync by hand when bumping a major dependency
  that raises the floor (e.g. `@google-cloud/pubsub@^6` requiring Node ≥22, done in #15).
