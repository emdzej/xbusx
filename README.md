# ibusx

A reference manual for **BMW I-Bus and K-Bus** — the in-vehicle communication protocol used on E31, E38, E39, E46, E52, E53, E83, E85, E86, E87 (and related chassis) from 1989 through roughly 2013.

This repository synthesises three community sources — [BlueBus](https://github.com/blueBusProject/BlueBus), [wilhelm-docs](https://github.com/piersholt/wilhelm-docs), and bimmerz — into a single, citation-aware reference. It is intended both as an entry point for anyone curious about how BMW vehicles talk to themselves, and as a sufficient foundation for building software that interacts with the bus.

## Scope

- **In scope:** I-Bus and K-Bus message-level protocol — framing, addressing, devices, messages, choreography.
- **Out of scope:** the diagnostic protocol (KWP2000, EDIABAS jobs), D-Bus, M-Bus, P-Bus. These are different protocols on different wires; they are mentioned only for context.

## Where to start

Read [`docs/README.md`](docs/README.md) for the table of contents and reading paths.

## Status

Work in progress. Each claim is cited to its source; disagreements between sources are surfaced rather than smoothed over. See [`docs/conventions.md`](docs/conventions.md) for the citation format and [`docs/sources-and-provenance.md`](docs/sources-and-provenance.md) for the source list and precedence rules.

## Contributing

Corrections welcome. Cite your source. If a claim disagrees with what's documented here, surface the disagreement in a conflict block rather than overwriting silently — the format is described in `docs/conventions.md`.
