# Validation Debt Ledger

## Purpose

Record known validation failures that are not caused by the current task, so agents can separate existing repo debt from real regressions.

## Rules

- This ledger does not excuse current-task failures.
- Every entry needs an owner, scope, and unblock condition.
- Do not include secrets, tokens, raw production data, customer identifiers, or private evidence.
- If a failure starts affecting the current task, promote it from debt to blocker.

## Entries

| ID | Date | Command | Failure Summary | Scope | Owner | Blocks Current Task? | Unblock Condition | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VD-001 | YYYY-MM-DD | `[command]` | `[sanitized failure]` | repo-wide / task-specific / external service | `[owner]` | yes/no | `[required fix or approval]` | `[report path or safe excerpt]` |
| VD-002 | 2026-07-02 | `npm run ips:audit` | strict_doc_audit fails because `12_validation/VAL-TASK-004.md` through `VAL-TASK-007.md` reference missing legacy repo path `/home/ssf/Documents/Github/heureka-service` while the active repo path is `/home/ssf/Documents/Github/heureka`. | repo-wide documentation path debt | IPS/docs owner | no | Update legacy validation docs to the current repo path or create an approved compatibility artifact. | 2026-07-02 worker run: score 60/100, 4 HIGH path findings. |

## Current-Task Decision Checklist

- Does the failing command touch files changed by this task?
- Does the failure mention this task ID, goal ID, or changed module?
- Is the failure already listed above with `Blocks Current Task? = no`?
- Did the failure exist before this task started?
- Is the validation command required by the current task acceptance criteria?

## Agent Reporting Format

```text
Validation debt check:
- Command:
- Result:
- Matched ledger entry:
- Current-task impact:
- Next action:
```

Next step: Keep entries current whenever validation failures are classified as out of scope.
