---
name: engram-pending-tasks
description: "user mentions pending, tech-debt, TODO, pendiente, deuda técnica, or asks about pending tasks. Normalizes Engram task tracking."
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## Activation Contract

Load this skill when: user mentions pending, tech-debt, TODO, pendiente, deuda técnica, or asks about pending tasks. Normalizes Engram task tracking..

Before executing substantive work, read `references/full-contract.md` when it exists and the task needs details beyond this compact contract.

## Hard Rules

- Preserve the original contract details in `references/full-contract.md`; do not replace them with generic assumptions.
- Keep the skill scope narrow: apply this skill only to the surface named in the description and reference.
- Escalate before changing product, architecture, persistence, security, or SDD phase semantics not explicitly covered.
- Do not use external URLs as primary authority; use local references and repo evidence.

## Decision Gates

| If | Then |
|---|---|
| The task is a small/read-only check | Use this compact contract and inspect only needed local files. |
| The task changes behavior or architecture | Read `references/full-contract.md` before planning or editing. |
| The task crosses another skill boundary | Load the more specific related skill or ask before proceeding. |
| Required evidence is missing | Stop and report the missing evidence instead of inventing rules. |

## Execution Steps

1. Confirm the touched surface and whether `references/full-contract.md` is needed.
2. Apply hard rules and any detailed local reference rules before editing.
3. Use the narrowest validation path available for the touched surface.
4. Record evidence: files inspected, rules applied, validations run, and unresolved risks.

## Output Contract

Return:
- Skill applied: `engram-pending-tasks`.
- Scope/surface handled.
- Whether `references/full-contract.md` was read.
- Hard rules and decision gates used.
- Validation or evidence collected, or why it could not be collected.
- Open risks, blockers, or follow-up actions.

## References

- `references/full-contract.md` — full detailed contract moved out of runtime body.
