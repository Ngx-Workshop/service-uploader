# Specification-driven implementation workflow

This repository uses a lightweight Markdown adaptation of
[GitHub Spec Kit](https://github.com/github/spec-kit): durable principles plus
feature-specific requirements, plans, and tasks. This is not an installed Spec Kit
distribution; no CLI or slash commands are required. An agent can follow these
steps using ordinary file reads and edits.

## Document layout

| Location | Purpose | Update when |
| --- | --- | --- |
| [Agent entry point](../AGENTS.md) | Reading order and working rules | Agent workflow changes |
| [Constitution](memory/constitution.md) | Durable engineering principles | Principles change intentionally |
| [Architecture](../docs/architecture.md) | Current ownership, source map, external contracts | Architecture/integration changes |
| [Development](../docs/development.md) | Commands, verification, inherited limitations | Tooling or known behavior changes |
| [Seed adoption](../docs/seed-adoption.md) | Checklist for a new repository copied from this seed | Scaffolding requirements change |
| [Templates](templates/) | Starting points for feature artifacts | Workflow improves |
| [Feature index](../specs/README.md) | Links and status for actual work | Feature starts or status changes |
| `specs/NNN-short-name/` | One feature's spec, plan, tasks, and handoff | That feature evolves |

Keep stable facts in context docs; feature decisions and progress belong in the
feature folder. Do not turn the constitution into a task log.

## 1. Orient and select work

Read `AGENTS.md` and the context it links. Inspect relevant source and the working
tree. If the user names an existing feature, continue its folder. Otherwise inspect
the index and existing directories, choose the next unused three-digit number,
and create `specs/NNN-short-name/`. Do not infer the active feature solely from the
highest number. Add a relative link and status to the index.

Feature work includes new behavior, nontrivial bug fixes, and contract changes.
For small documentation edits or mechanical fixes, a concise change and
verification summary is sufficient; do not create four ceremonial artifacts.

## 2. Specify the outcome

Copy [spec-template.md](templates/spec-template.md) to the feature's `spec.md`.
Describe the problem, audience, scope, observable requirements, acceptance
scenarios, edge cases, and success criteria before choosing implementation details.

Give requirements stable IDs (`FR-001`) and scenarios IDs (`AC-001`). Record
assumptions and unresolved decisions. Mark consequential unknowns
`NEEDS CLARIFICATION`; ask a focused question only if the answer is necessary.
Continue work that does not depend on that answer. Never turn elapsed time or an
unanswered question into agreement.

## 3. Plan against this checkout

Copy [plan-template.md](templates/plan-template.md) to `plan.md`. Inspect source,
identify affected files and boundaries, and map the design to requirements.
Check the constitution and document deviations rather than silently ignoring them.
Describe validation, compatibility, data changes, and verification.

Research only what is needed. Optional `research.md`, `data-model.md`, or
`contracts/` notes belong in this feature folder when useful; they are not
mandatory empty documents. Cite source paths or authoritative references for
important findings. Do not require another repository's checkout to plan this one.

## 4. Create executable tasks

Copy [tasks-template.md](templates/tasks-template.md) to `tasks.md`.
Use checkboxes and stable task IDs (`T001`), actual paths, requirement/scenario
references, dependencies, and a verification step. Separate local work from work
owned by an external repository. A task is complete only with evidence.

Check spec → plan → tasks for consistency before implementation. Remove stale
placeholders from working artifacts; resolve ambiguities that affect the next task.

## 5. Implement and verify

Implement the scoped tasks, update progress, and run checks appropriate to the
change. Use local test doubles when external services are unavailable. Record
failures and blockers accurately; do not turn a mocked check into an integration
claim. Update the spec/plan if new evidence changes a decision.

The stages organize work; they do not require repeated permission requests when
the user has already authorized implementation. User constraints and requested
review checkpoints still apply.

## 6. Leave a usable handoff

Copy [handoff-template.md](templates/handoff-template.md) to `handoff.md`.
Record completed behavior, changed contracts, verification evidence, remaining
tasks, and the exact next step. Update context docs and the feature index.

Suggested statuses: `Draft`, `Ready`, `In progress`, `Blocked`,
`Implemented; integration pending`, `Complete`.
A blocked external dependency does not prevent independent local work. Use
`Complete` only when the feature's stated acceptance scope has been verified;
otherwise preserve the outstanding scope and evidence gap.

## Cross-repository changes

When another owner must change something, record the repo name, exact
contract/behavior requested, producer/consumer compatibility, order of changes,
and acceptance check. Continue authorized local work. Do not silently change the
external contract in a mock or claim that a handoff deployed the other service.

## Keeping the workflow reusable

Each seed contains a complete copy of these workflow/templates so a clone works
independently. When changing the shared process in the seeds, review both copies.
Adopted product repositories own their subsequent changes; there is no automatic
synchronization or dependency on a workspace-level file.
