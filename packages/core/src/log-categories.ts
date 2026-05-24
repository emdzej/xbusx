/**
 * Logger-category catalogue for the xbusx subsystem.
 *
 * Consumer apps (the xbusx web app's future Settings UI, the xbusx
 * CLI's `--log-category` help text) iterate this array to build
 * per-category controls without hardcoding category names. Hints
 * surface as tooltips / sublabels.
 *
 * The hint must be one sentence; longer copy belongs in docs.
 */

import type { LogCategory } from '@emdzej/bimmerz-logger'

export const LOG_CATEGORIES: readonly LogCategory[] = [
  {
    name: 'XBUSX',
    hint: 'Catch-all for the xbusx subsystem — overrides any unmatched subtree below.',
  },
  {
    name: 'XBUSX.ikbus',
    hint: 'I/K-bus protocol stack — frame parse, device registry, send / receive.',
  },
  {
    name: 'XBUSX.dbus',
    hint: 'D-bus (DS2) protocol stack — frame parse, device registry, send / receive.',
  },
  {
    name: 'XBUSX.transport',
    hint: 'Serial transport — port open / close, baud-rate negotiation, raw read loop.',
  },
  {
    name: 'XBUSX.web',
    hint: 'Web app — connection lifecycle, registry events, UI-side state changes.',
  },
  {
    name: 'XBUSX.cli',
    hint: 'CLI app — command dispatch, TUI lifecycle, port enumeration.',
  },
]
