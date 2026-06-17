# GeeksTalk Project Instructions (CLAUDE.md)

## 1. Core Principle
Always prioritize:
1. Correctness
2. Consistency with the existing codebase
3. Minimal, safe changes

Do not guess or rely on memory when documentation or source-of-truth is available.

---

## 2. Documentation Routing (CRITICAL)

### Use Context7 FIRST for:
- Next.js
- React
- Tailwind CSS
- Prisma
- PostgreSQL libraries
- Vercel / deployment platforms
- Any npm package or external library
- API usage, configuration, or setup instructions
- Any other framework and library documentation

### Use OpenAI Docs MCP FIRST for:
- OpenAI APIs
- Responses API
- Realtime API
- Agents SDK
- embeddings / moderation
- model usage or pricing
- any OpenAI platform behavior

### Use LOCAL PROJECT (repo + docs) FIRST for:
- GeeksTalk architecture
- folder structure
- coding conventions
- feature-specific behavior
- database schema assumptions
- internal workflows

### Use `ui-ux-pro-max` skill + Magic MCP FIRST for:
- Any new page (App Router `page.tsx`)
- Any new React component (UI, layout, form, modal, chart, etc.)
- Any greenfield UI work or redesign

Required order for new UI work:
1. Invoke the `ui-ux-pro-max` skill first to plan/design (styles, palette, layout, UX guidelines)
2. Use Magic MCP tools (`mcp__magic__21st_magic_component_builder`, `mcp__magic__21st_magic_component_inspiration`, `mcp__magic__21st_magic_component_refiner`, `mcp__magic__logo_search`) to scaffold components before writing custom code
3. Then apply Context7 for framework-specific APIs (Next.js, React, Tailwind)
4. Then integrate with existing GeeksTalk patterns

Exceptions (skip skill + Magic MCP):
- Small edits to existing components (copy, props, bug fixes)
- Backend-only / API route work
- Non-visual refactors

### Conflict resolution:
- Vendor behavior → trust official docs (Context7 / OpenAI MCP)
- Project behavior → trust repo and local docs
- Never invent undocumented behavior

---

## 3. Coding Standards

### General
- Use TypeScript strict mode
- Follow existing naming conventions
- Prefer clarity over cleverness
- Avoid unnecessary abstractions

### Next.js
- Use App Router only
- Prefer Server Components
- Only use Client Components when required (state, effects, browser APIs)
- Keep logic server-side when possible

### React
- Keep components small and focused
- Avoid deeply nested component trees
- Reuse existing components before creating new ones

### Styling
- Use Tailwind CSS
- No inline styles unless unavoidable
- Follow existing design patterns and spacing rules

---

## 4. Project Structure Rules

- Do not create new folders unless necessary
- Follow existing directory structure
- Keep related logic close together
- Do not duplicate logic across files

Before adding new files:
1. Check if similar functionality already exists
2. Extend existing modules when appropriate

---

## 5. Database & Prisma Rules

- Always inspect existing Prisma schema before changes
- Do not assume relationships — verify them
- Keep migrations minimal and explicit
- Avoid destructive schema changes unless clearly required

When modifying DB:
- Explain impact
- Ensure compatibility with existing data

---

## 5.1 Database Safety Protocol (CRITICAL — read every time)

**Historical incident (2026-04-22):** Running `prisma migrate diff --shadow-database-url "$DATABASE_URL"` against the main DB caused Prisma to reset the "shadow" database (which was the real database) and replay only the known migrations, wiping every table and column that had been added via `prisma db push`. Result: full data loss on the local dev DB. Never repeat this.

### FORBIDDEN without explicit, typed user confirmation

These commands and flag combinations must NEVER be run by Claude (or any automated process) against any database that contains data — **especially** production. They reset, drop, or replay-from-scratch the target DB.

| Command / flag | What it does | Safe alternative |
|---|---|---|
| `prisma migrate reset` | Drops and recreates the database | No. Restore from backup, then reapply. |
| `prisma migrate dev` with a shadow URL that points at a real DB | Resets the shadow DB (= real DB) between replays | Use a dedicated `SHADOW_DATABASE_URL` (separate DB) or omit the flag — Prisma will create/drop a temp shadow automatically |
| `prisma migrate diff --shadow-database-url <any real URL>` | Resets that DB to replay migrations | Use `--from-url` (read-only introspection) with `--to-schema-datamodel`; do not pass `--shadow-database-url` unless the URL is a disposable DB |
| `prisma db push --force-reset` | Drops all tables and recreates | Restore from backup; never use on a DB with data |
| Any manual `DROP DATABASE` / `DROP SCHEMA public CASCADE` | Obvious data loss | N/A |

### Mandatory pre-checks before any schema-touching Prisma command

1. Confirm which DB the command targets. Print the URL host/db name back to the user. Never assume.
2. Confirm a current backup exists (for non-trivial DBs). If no backup, say so and ask before proceeding.
3. Know the difference: `migrate deploy` (safe, additive) vs `migrate dev` (local only, uses shadow) vs `db push` (syncs schema, never drops without `--force-reset`) vs `migrate diff` (analysis — read-only UNLESS `--shadow-database-url` is set).
4. `--shadow-database-url` means "a DB Prisma is allowed to wipe." Never point it at a DB that holds data.

### Production / auto-deploy guarantees

The GitHub Actions pipeline (`.github/workflows/deploy.yml` + `scripts/auto-migrate.sh`) is already safe:
- Only runs `prisma migrate deploy` (applies pending migrations; never drops, never replays).
- Explicitly disables automatic baselining — P3005 errors log a warning and proceed.
- Only `prisma generate` on top.

**Do not add any of the following to deploy scripts, CI, or production-targeted code paths:** `migrate reset`, `migrate dev`, `migrate diff --shadow-database-url …`, `db push --force-reset`, or any command that sets `--shadow-database-url` to a production URL. If a future migration problem surfaces in production, fix it via a new forward-migration SQL applied with `prisma migrate deploy` or `db execute` — never by replaying or resetting.

### If asked to "fix migration drift" / "clean up migrations"

This is the exact scenario that caused the incident. Procedure:
1. Confirm which environment (local / staging / prod) and whether a backup exists.
2. Prefer `prisma migrate diff --from-url <live> --to-schema-datamodel prisma/schema.prisma --script` (no shadow flag) to generate SQL against the live schema.
3. Apply the generated SQL via `prisma db execute --file <path>` and then `prisma migrate resolve --applied <name>`.
4. Never use `--shadow-database-url <live-db>` to validate ordering.

---

## 6. Workflow Rules

Before making changes:
1. Read relevant files
2. Understand current implementation
3. Check documentation (Context7/OpenAI MCP)
4. Then modify code

While editing:
- Make minimal changes
- Keep style consistent
- Do not refactor unrelated code

After editing:
- Validate logic
- Ensure no broken imports/types
- Check for edge cases

---

## 7. Validation Rules (Definition of Done)

A task is NOT complete unless:

### For logic/backend:
- Behavior matches requirement
- No obvious edge case is ignored
- Types are correct

### For UI:
- Flow works logically (not just compiles)
- No broken components or missing states
- Responsive behavior is reasonable

### For config/integration:
- Matches official documentation
- No deprecated APIs used

If unsure → explicitly state uncertainty.

---

## 8. MCP Usage Rules

- Always use Context7 for framework/library questions
- Always use OpenAI MCP for OpenAI-related work
- Do NOT rely on memory when docs are available
- Prefer docs over assumptions

If documentation exists but is not used → this is considered an error

---

## 9. Safety & Change Control

- Do not introduce breaking changes silently
- Do not modify large areas without reason
- Do not remove code unless certain it is unused
- Highlight risky changes before applying them

---

## 10. Communication Style

- Be concise and direct
- Explain reasoning only when necessary
- Call out uncertainties explicitly
- Do not hallucinate missing details

---

## 11. Anti-Patterns (STRICTLY AVOID)

- Guessing API behavior
- Ignoring existing project patterns
- Overengineering simple features
- Creating duplicate components/utilities
- Making large refactors without instruction
- Using outdated or deprecated APIs

---

## 12. Preferred Workflow (Always Follow)

1. Read task
2. Inspect repo
3. Use appropriate docs MCP
4. Implement minimal change
5. Validate result

---

## 13. Project Context (Fill as you build)

- Auth logic location:
- Database schema:
- API routes:
- Shared components:
- Deployment platform:

---

END OF RULES
