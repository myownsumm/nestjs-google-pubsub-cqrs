# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

See also: [GitHub Releases](https://github.com/myownsumm/nestjs-google-pubsub-cqrs/releases).

## [1.1.0]

### Added
- Pub/Sub global listener for end-to-end testing (`src/lib/testing/global-bus.ts`).

## [1.0.1] - 2025-07-21

### Changed
- Stable release follow-up to `1.0.0`.

## [1.0.0] - 2025-07-21

First stable release.

### Added
- Drop-in replacement for the default NestJS CQRS event bus backed by Google Pub/Sub.
- Synchronous and asynchronous module configuration (`PubSubCqrsModule.forRoot` / `forRootAsync`).
- Auto-discovery and registration of event handlers.
- Custom Docker emulator (`myownsumm/nestjs-google-pubsub-emulator`) for local development.
- Comprehensive documentation and microservices examples.

## [0.0.7] - 2025-07-17

### Fixed
- NestJS v11 event handlers metadata resolution.

### Added
- Local infrastructure for integration-testing setup.

## [0.0.6] - 2025-07-14

### Fixed
- Hotfix: reverted infrastructure changes to make the library working again.

## [0.0.5] - 2025-07-13

### Fixed
- `moduleRef` context resolution.

## [0.0.4] - 2025-07-13

### Added
- Integration-testing infrastructure.

### Fixed
- Hotfix for `moduleRef` export.

## [0.0.3] - 2025-07-12

### Changed
- GitHub repo publish automation test.

## [0.0.2] - 2025-07-12

Initial pre-release published to npm.

## [0.0.1] - 2025-07-12

Initial release (GitHub tag only, not published to npm).
