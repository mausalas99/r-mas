# Metrics & technical debt

Debt accounting is defined in `.cursor/rules/technical-debt-accounting.mdc`.

| File | Role |
|------|------|
| `baseline.json` | Committed snapshot; PRs must not increase `totalScore`. |
| `report.json` | Generated locally/CI (gitignored). |

Planned scripts (modularization spec):

- `npm run metrics` — lint + jscpd + dependency-cruiser + boot graph hash → `report.json`
- `npm run metrics:check` — fail if `report.totalScore > baseline.totalScore` or Tier 1 violations in changed files
- `npm run metrics:baseline` — refresh `baseline.json` after approved debt paydown
