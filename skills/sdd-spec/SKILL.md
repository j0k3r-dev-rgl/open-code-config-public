---
name: sdd-spec
description: Compact specification rules for describing required behavior changes.
license: MIT
metadata:
  author: gentleman-programming
  version: "2.1"
---

## Purpose

Translate the proposal into testable behavioral requirements and scenarios.

## Inputs

- Change name
- Artifact mode: `engram | openspec | hybrid | none`
- Proposal artifact (required)

## Shared Protocol

- Follow `skills/_shared/sdd-phase-common.md`
- Artifact produced: `spec`
- Topic key: `sdd/{change-name}/spec`

## Domain Rule

- If the domain already has a spec, write a DELTA spec with `ADDED`, `MODIFIED`, `REMOVED`.
- If the domain is new, write a FULL spec.

## Workflow

1. Retrieve the proposal.
2. Identify affected domains.
3. Read existing specs only for those domains.
4. Write testable requirements and scenarios.
5. Persist the artifact when required.

## Output Format

### Delta Spec

```markdown
# Delta for {Domain}

## ADDED Requirements
### Requirement: {Name}
The system MUST {behavior}.

#### Scenario: {Name}
- GIVEN {precondition}
- WHEN {action}
- THEN {outcome}

## MODIFIED Requirements
### Requirement: {Name}
{New behavior}
(Previously: {old behavior})

## REMOVED Requirements
### Requirement: {Name}
(Reason: {why})
```

### Full Spec

```markdown
# {Domain} Specification

## Purpose
{What this domain covers}

## Requirements
### Requirement: {Name}
The system MUST {behavior}.

#### Scenario: {Name}
- GIVEN {precondition}
- WHEN {action}
- THEN {outcome}
```

## Rules

- Use RFC 2119 keywords: MUST, SHALL, SHOULD, MAY.
- Every requirement MUST have at least one scenario.
- Use Given/When/Then always.
- Cover happy path and at least one edge case where relevant.
- Describe WHAT, not HOW.
- In `openspec`, write domain specs under the change folder.
