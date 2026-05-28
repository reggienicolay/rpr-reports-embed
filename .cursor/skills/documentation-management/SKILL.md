# Documentation Management Skill

Activate this skill when creating, updating, or syncing project documentation.

## Documentation Map

| Document | Path | Triggers for update |
|----------|------|-------------------|
| PRD | `docs/prd/prd.md` | Product scope change, new user segment, goal change |
| FRD | `docs/frd/frd.md` | New `data-*` attribute, new form/display mode, webhook payload change, new delivery method |
| ADR | `docs/adr/adr.md` | Architectural decision (new pattern, library, integration) |
| Design | `docs/design/design.md` | Component added/removed, data flow change, new integration |
| Guidelines | `docs/guidelines/guidelines.md` | Code style change, new testing requirement, release process change |
| Infra | `docs/infra/infra.md` | Hosting change, CDN change, deployment process change |
| Context | `docs/context/context.md` | Tech stack change, new file, feature list change |
| Rules | `docs/rules.md` | New constraint, security rule, backwards compat rule |
| Improvement Plan | `docs/RPR_Widget_Improvement_Plan.md` | Phase completion, scope change, cost update |
| README | `README.md` | Version bump, new feature, config reference change, changelog |
| Cursor Rules | `.cursor/rules/*.mdc` | Version, file structure, convention change |
| Claude Rules | `.claude/rules/*.md` | Mirror of Cursor rules (same content, no YAML frontmatter) |

## ADR Template

```markdown
### ADR-NNN: [Title]

**Status:** Proposed | Active | Deprecated | Superseded by ADR-NNN
**Date:** YYYY-MM-DD
**Context:** [What prompted this decision]
**Decision:** [What was decided]
**Consequences:** [Positive and negative outcomes]
```

## FRD Entry Template

```markdown
### FR-N.N: [Requirement Title]

**Priority:** Must Have | Should Have | Nice to Have
**Status:** Implemented | Planned | Deprecated
**Description:** [What the system does]
**Acceptance Criteria:**
- [Criterion 1]
- [Criterion 2]
**Implemented in:** [File(s) and version]
```

## Version Synchronization

When a version bump occurs, update ALL of these:

1. `rpr-reports-embed.js` — file header comment
2. `generator.js` — file header comment
3. `README.md` — version badge
4. `docs/prd/prd.md` — version field
5. `.cursor/rules/rpr-reports-embed-project.mdc` — Version field
6. `.claude/rules/rpr-reports-embed-project.md` — Version field (mirror)

## Update Triggers Matrix

| Change Type | Must Update |
|-------------|-------------|
| New `data-*` attribute | FRD, Guidelines (testing checklist), README (config reference), Context (feature list) |
| New display/form mode | FRD, PRD, Design, Guidelines (testing checklist), README |
| Bug fix | Widget changelog, README changelog, fix ID comment in code |
| Security fix | Widget changelog, README changelog, Rules (if new constraint), ADR (if pattern change) |
| New integration | FRD (delivery methods), Design (data flow), Infra (if new service) |
| File added/removed | Context (file tree), Guidelines (file organization), Project rule (file structure) |
| Dependency added | Context (tech stack), ADR (decision record), PRD (dependencies) |
| Version bump | All 6 version locations listed above |
| Rule/convention change | `.cursor/rules/`, `.claude/rules/` (mirror), `docs/rules.md` (human-readable mirror) |

## Quality Checklist

Before committing documentation:

- [ ] All Markdown renders correctly (headers, tables, code blocks, links)
- [ ] Internal links point to correct files and anchors
- [ ] Version numbers are consistent across all documents
- [ ] ADR status values are current (Active, Deprecated, Superseded)
- [ ] FRD requirement IDs are unique and sequential
- [ ] No placeholder text or TODO markers left in docs
- [ ] Cursor and Claude rule/skill files are in sync
