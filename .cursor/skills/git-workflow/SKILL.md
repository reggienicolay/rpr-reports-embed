# Git Workflow Skill

Activate this skill for branching, committing, pushing, and PR creation.

## Remote

- **Origin:** `reggienicolay/rpr-reports-embed` (GitHub)
- **Collaborator:** `rodrigorenault` (push access)
- **Default branch:** `main`

## Branch Naming

```
<type>/<short-description>
```

| Type | Use |
|------|-----|
| `feat/` | New feature or capability |
| `fix/` | Bug fix |
| `sec/` | Security fix |
| `refactor/` | Code restructuring |
| `docs/` | Documentation only |
| `chore/` | Tooling, config, maintenance |
| `phase1/` | Phase 1 improvement plan items |
| `phase2/` | Phase 2 improvement plan items |

Examples: `fix/silent-lead-loss`, `feat/localstorage-retry`, `phase1/input-validation`

## Branch Verification (Before Implementation)

1. Run `git branch --show-current` to check current branch
2. Run `git fetch origin` to sync remote state
3. **If on correct feature branch:** verify it includes latest `main` via `git log --oneline HEAD..origin/main` (should be empty)
4. **If behind `main`:** merge `origin/main` into the feature branch
5. **If on `main` or wrong branch:** `git checkout main && git pull && git checkout -b <type>/<description>`
6. Report branch name and status to user before proceeding

## Conventional Commits

```
<type>: <description>

[optional body]

[optional footer]
```

| Type | Use |
|------|-----|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `sec` | Security fix |
| `refactor` | Code restructuring without behavior change |
| `style` | CSS or formatting changes |
| `docs` | Documentation only |
| `chore` | Tooling, config, or maintenance |

Examples:
```
feat: add localStorage retry queue for failed webhook submissions
fix: treat HTTP 4xx/5xx as submission failure instead of silent success
sec: validate data-card-bg and data-card-text with isValidHex
docs: add comprehensive project documentation and improvement plan
```

## Semantic Versioning

`MAJOR.MINOR.PATCH` — currently `1.1.0`

| Level | When to Increment |
|-------|-------------------|
| MAJOR | Breaking change to `data-*` attribute contract or webhook payload schema |
| MINOR | New features (new attributes, new display modes, new delivery methods) |
| PATCH | Bug fixes, security fixes, CSS tweaks |

### Version Locations (Update All)

1. `rpr-reports-embed.js` — file header comment
2. `generator.js` — file header comment
3. `README.md` — version badge
4. `docs/prd/prd.md` — version field
5. `.cursor/rules/rpr-reports-embed-project.mdc` — Version field
6. `.claude/rules/rpr-reports-embed-project.md` — Version field (mirror)

## Pre-Commit Gate (Mandatory)

Before every commit, verify:

- [ ] ReadLints passes on all edited files
- [ ] No `console.log` in production code (widget `console.warn` for config errors is OK)
- [ ] No exposed secrets, API keys, or webhook URLs in committed code
- [ ] Documentation updated for any behavior change (same commit)
- [ ] `.cursor/rules/` and `.claude/rules/` still reflect the codebase
- [ ] Fix IDs (`BUG N`, `SEC-N`) assigned for bug/security fixes
- [ ] Changelog updated in widget header and README for releases

## Commit Procedure

1. Stage relevant files: `git add <files>`
2. Commit with conventional message via HEREDOC
3. Run `git status` to verify success
4. NEVER push without explicit user approval
5. When approved: `git push -u origin HEAD`

## Commit Granularity

- One logical change per commit
- Documentation updates in the same commit as related code changes
- Version bumps in the same commit as the feature/fix they version
- Never mix unrelated changes in a single commit
