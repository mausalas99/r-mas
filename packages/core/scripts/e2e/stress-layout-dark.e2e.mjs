#!/usr/bin/env node
/** Dark shard of stress-layout: run-all.mjs runs it beside the light one. */
process.env.LAYOUT_SHARD = 'dark';
await import('./stress-layout.e2e.mjs');
