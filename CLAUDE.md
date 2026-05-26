# RPR Reports Embed Widget — AI Development Workflow

This file is the shared workflow master for both Cursor and Claude Code. It loads automatically in both tools.

## Development Lifecycle (7 Mandatory Phases)

Every task follows these phases in order. Phases may be lightweight for small tasks but never skipped.

1. **Context** — Read relevant docs before touching code (`prd.md`, `frd.md`, `adr.md` for features; `guidelines.md` for standards; `design.md` for architecture)
2. **Analyze** — Trace to FRD requirement (FR-ID), propose 2 approaches, wait for approval
3. **Plan** — Break into tasks with progress tracking (TodoWrite for 3+ steps)
4. **Implement** — One feature per cycle, follow code convention rules
5. **Verify** — Lint check, regression check, no `console.log` in production
6. **Document** — Update all affected docs BEFORE committing (use `documentation-management` skill)
7. **Commit** — Conventional commits, pre-commit gate, push only with explicit approval

## Skills

Available in both `.cursor/skills/` and `.claude/skills/`:

| Skill | Activates For |
|-------|--------------|
| `widget-development` | Widget JS, inline CSS, display modes, form logic, webhook submission |
| `generator-development` | Generator HTML/JS, live preview, embed code output, delivery methods |
| `git-workflow` | Branching, conventional commits, pre-commit checks, push |
| `testing` | Code review, verification, regression checks, browser testing |
| `documentation-management` | Doc creation, updates, version sync, ADR/FRD authoring |
| `openspec-propose` | Propose a new change — creates proposal, design, and tasks artifacts |
| `openspec-apply-change` | Implement tasks from an OpenSpec change proposal |
| `openspec-explore` | Thinking mode — explore ideas, investigate problems, clarify requirements |
| `openspec-archive-change` | Archive a completed change after implementation |

## OpenSpec Integration (Automatic)

OpenSpec is natively integrated into the 7-phase lifecycle. The AI **automatically** creates spec artifacts based on task complexity — no slash commands needed from the user.

| Task type | What happens automatically |
|-----------|--------------------------|
| **Trivial** (typo, style fix, doc-only) | Direct implementation, no OpenSpec artifacts |
| **Standard** (bug fix, small feature) | Auto-creates proposal.md + design.md + tasks.md in `openspec/changes/<name>/` |
| **Complex** (new feature, multi-file, architectural) | Full OpenSpec artifacts with detailed design and granular tasks |

- The analysis the user sees (approaches, recommendation, task list) is the same — it's just persisted as artifacts instead of ephemeral chat text
- After commit, changes are auto-archived to `openspec/changes/archive/`
- At session start, the AI checks for active changes and resumes them
- User can say "skip the proposal" to go direct, or "let's explore first" for thinking mode
- `/opsx:*` slash commands still work for manual control when preferred

## Rules

Available in both `.cursor/rules/` and `.claude/rules/`:

| Rule | Scope |
|------|-------|
| `ai-development-workflow` | Always loaded — this lifecycle orchestrator |
| `rpr-reports-embed-project` | Always loaded — project context and technical standards |
| `javascript-conventions` | Auto-loaded for `**/*.js` |
| `apps-script-conventions` | Auto-loaded for `**/*.gs` |

## Documentation Sync Gate

### Before Every Commit
1. Review `docs/` for sections affected by the change
2. Update any docs that reference modified behavior, file structure, dependencies, or versions
3. Verify rule files (`.cursor/rules/` and `.claude/rules/`) still reflect the codebase
4. Include documentation updates in the same commit as code changes

### After Pulling Remote Changes
1. Analyze incoming changes (new/removed files, renamed functions, version bumps)
2. Cross-reference with all docs under `docs/` and rule files
3. Report discrepancies to the user before proceeding
4. Update docs on a dedicated branch or alongside the next feature commit

## Configuration Sync (Cursor + Claude Code)

This project maintains parallel AI configurations:

| Cursor | Claude Code | Content |
|--------|------------|---------|
| `.cursor/rules/*.mdc` | `.claude/rules/*.md` | Same body, tool-specific frontmatter |
| `.cursor/skills/*/SKILL.md` | `.claude/skills/*/SKILL.md` | Identical content |

**Sync rules:**
- When updating any rule or skill, update BOTH the `.cursor/` and `.claude/` versions
- Root `CLAUDE.md` (this file) is the shared workflow master — changes apply to both tools
- Content body is identical; only frontmatter differs (Cursor uses `globs:`/`alwaysApply:`, Claude Code uses no frontmatter)

## Decision Protocol

- **Architectural decision** → create/update ADR in `docs/adr/adr.md`
- **New functionality** → trace to existing FR-ID in `docs/frd/frd.md` or propose new one
- **Breaking change** → document in commit body with `BREAKING CHANGE:` footer
- **Deprecation** → mark old ADR as Superseded, add new ADR referencing it

## Architecture Constraints (Non-Negotiable)

- Zero dependencies — widget is a single-file IIFE, no npm, no CDN libraries
- DOM API only — never `innerHTML` with user data
- `document.currentScript` for config — requires synchronous script loading
- HTTPS-only webhooks — reject all non-HTTPS schemes
- Backwards compatible — new `data-*` attributes must default to previous behavior
