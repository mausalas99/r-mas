# Agent base instructions

These principles apply to all agent work in this repository. Prefer them over habit and over preserving legacy paths.

1. **Choose the simplest implementation** that fully meets the current requirements. Avoid speculative abstractions, configuration, and indirection.
2. **Grow the system in layers.** Start from the smallest version that works end to end, and add each new capability on top of a product that already works. Never trade a working product for unfinished complexity.
3. **Keep components modular** and concerns clearly separated.
4. **Prefer established, well-maintained libraries** when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
5. **Lean on the dependencies already in the project** before writing your own implementation or adding packages. Do not assume a library lacks a capability without checking its documentation and types.
6. **Make architectural decisions for the long term.** Do not accept a stopgap that only works for now and is meant to be replaced later.

## Read next

1. [`.cursor/rules/project-context.mdc`](.cursor/rules/project-context.mdc) — code map
2. [`.cursor/rules/tests-with-code.mdc`](.cursor/rules/tests-with-code.mdc) — update + `test:one` colocated tests in the same turn as behavior changes
3. [`docs/core/01-vision-north-star.md`](docs/core/01-vision-north-star.md) — product trade-offs
4. [`CLAUDE.md`](CLAUDE.md) — build/test pointers
