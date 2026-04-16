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
