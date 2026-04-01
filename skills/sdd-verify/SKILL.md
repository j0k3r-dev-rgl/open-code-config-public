---
name: sdd-verify
description: Compact verification rules for proving an implementation matches the planned change.
license: MIT
metadata:
  author: gentleman-programming
  version: "3.1"
---

## Purpose

Verify completeness, correctness, and behavioral compliance with REAL execution evidence.

## Inputs

- Change name
- Artifact mode: `engram | openspec | hybrid | none`
- Proposal, spec, design, tasks (all required)

## Shared Protocol

- Follow `skills/_shared/sdd-phase-common.md`
- Artifact produced: `verify-report`
- Topic key: `sdd/{change-name}/verify-report`

## Verification Principle

Static inspection is not enough.

You MUST:
- inspect implementation structure
- run tests when a runner exists
- run build/type-check when available and allowed by project rules
- use runtime evidence in the final report

## Resolve Verification Mode

Read cached testing capabilities first.

- If `strict_tdd: true` and a runner exists → Strict TDD verification
- Otherwise → Standard verification

Load `skills/sdd-verify/strict-tdd-verify.md` only in Strict TDD mode.

## Preferred Tools

- `find_symbol`
- `trace_symbol`
- `trace_callers`
- `grep_workspace`
- `scan_module`
- `list_endpoints`
- `api_test` when backend runtime evidence is useful
- `bash` for tests, build, coverage, and quality commands

## Workflow

1. Retrieve all required artifacts and testing capabilities.
2. Check task completeness.
3. Check spec-to-code structural evidence.
4. Check design coherence.
5. In Strict TDD mode, run the extra TDD checks.
6. Verify tests exist for the scenarios.
7. Run test command.
8. Run build/type-check if available and not blocked by project rules.
9. Run coverage if available.
10. Build the spec compliance matrix from actual test results.
11. Persist the verification report.

## Severity Rules

- **CRITICAL**: missing requirement, failing test, untested required scenario, build failure, incomplete core task
- **WARNING**: partial scenario coverage, design deviation, skipped relevant tests, missing secondary quality evidence
- **SUGGESTION**: improvement opportunity without blocking correctness

## Output Format

```markdown
## Verification Report

**Change**: {change-name}
**Mode**: {Strict TDD | Standard}

### Completeness
| Metric | Value |
|--------|-------|
| Tasks total | {N} |
| Tasks complete | {N} |
| Tasks incomplete | {N} |

### Execution Evidence
- Test command: `{command}`
- Tests: ✅ / ❌
- Build/type-check: ✅ / ❌ / Not available
- Coverage: {value or Not available}

### Spec Compliance Matrix
| Requirement | Scenario | Evidence | Status |
|-------------|----------|----------|--------|
| {req} | {scenario} | `test/file` | ✅ / ❌ / ⚠️ |

### Findings
- CRITICAL: {item or None}
- WARNING: {item or None}
- SUGGESTION: {item or None}

### Verdict
{Pass / Partial / Fail}
```

## Rules

- If a test runner exists, you are expected to execute it.
- A scenario is compliant only when runtime evidence proves it.
- Existing code without passing test evidence is NOT enough.
- If project rules forbid builds, skip build/type-check and report that constraint explicitly.
- If a command is unavailable, say so explicitly and downgrade appropriately.
- Keep the report precise and evidence-based.
