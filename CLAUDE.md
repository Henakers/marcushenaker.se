## Engineering conventions

### Language

Everything committed to this repo is written in English (en-US): identifiers, comments, documentation and commit messages, regardless of the language of the conversation.

User-facing language: en-GB

### Commits

Commit messages follow [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/): `type(scope): description`.

### Issues first

Every change to this repo starts from a GitHub issue the user has agreed to. When no issue exists for the work, create one (title and a short body), wait for the user's OK, then implement. The commit that finishes the work references the issue in its footer: `Closes #<n>`.

### Workflow

Planning and tracking live on GitHub issues, so the whole route stays visible there. `/wayfinder` and `/grill-with-docs` create their own issues; the rule above is the default without them.

- A new project, or a feature too big for one session (a rewrite, a new subsystem), starts with `/wayfinder`: it names the destination and charts the decisions as tickets.
- A single feature or design question (a UI that feels wrong, one behaviour to settle) goes through `/grill-with-docs`, with `/prototype` when seeing it beats discussing it.
- Resolved tickets are not gone: the wayfinder map issue's "Decisions so far" is the index. Read it before picking up work.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for Henakers/portfolio, via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
