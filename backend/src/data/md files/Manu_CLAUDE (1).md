# AI Agent Config (petasight/babbageinsight)

## 1. CONTEXT-MODE (MANDATORY)

Protects context window from flooding. A single unrouted command can dump 56KB into context.

**BLOCKED — do NOT use:**
| Blocked | Use instead |
|---------|-------------|
| `curl` / `wget` in Bash | `ctx_fetch_and_index(url, source)` or `ctx_execute(language:"javascript", code:"fetch(...)")` |
| Inline HTTP (`requests.get`, `http.get`, `fetch('http`) in Bash | `ctx_execute(language, code)` |
| WebFetch | `ctx_fetch_and_index(url, source)` then `ctx_search(queries)` |
| Bash with >20 lines output | `ctx_batch_execute(commands, queries)` or `ctx_execute(language:"shell", code:"...")` |
| Read for analysis/exploration | `ctx_execute_file(path, language, code)` — only summary enters context |
| Grep (large results) | `ctx_execute(language:"shell", code:"grep ...")` |

Bash is ONLY for: `git`, `mkdir`, `rm`, `mv`, `cd`, `ls`, `npm install`, `pip install`, short-output commands.

**Tool hierarchy:**

1. `ctx_batch_execute(commands, queries)` — primary. ONE call replaces 30+.
2. `ctx_search(queries: ["q1","q2"])` — ALL questions in one array call.
3. `ctx_execute(language, code)` / `ctx_execute_file(path, language, code)` — sandbox, only stdout enters context.
4. `ctx_fetch_and_index(url, source)` → `ctx_search(queries)` — web, raw HTML never enters context.
5. `ctx_index(content, source)` — store in FTS5 knowledge base.

**Output constraints:** Responses under 500 words. Write artifacts to FILES, return only path + 1-line description. Use descriptive source labels for indexing.

**Subagents:** Routing auto-injected into subagent prompts. No manual instruction needed.

**ctx commands:** `ctx stats` → `ctx_stats` tool | `ctx doctor` → `ctx_doctor` tool + run shell cmd | `ctx upgrade` → `ctx_upgrade` tool + run shell cmd.

---

## 2. RULES

**Principles:** Simplicity first. Root causes only. Touch minimal code. Senior dev standards.

**1. Think First** — Use AskUserQuestionTool by default for non-trivial work (3+ steps, architectural decisions, ambiguous requirements, destructive actions). State assumptions. Push back when simpler exists. STOP and re-plan if things go sideways. _(Clarifying upfront costs less than fixing wrong assumptions after.)_

**2. Simplicity** — Minimum code solving the problem. No speculative features, abstractions, or impossible-scenario error handling. If 200 lines could be 50, rewrite it. _(Overengineering compounds into unmaintainable codebases.)_

**3. Surgical Changes** — Match existing style. Don't refactor unbroken code. Remove only orphans YOUR changes created. Mention (don't delete) unrelated dead code. _(Every changed line should trace back to the user's request.)_

**4. Verify Before Done** — Define success criteria, loop until proven. _(Strong criteria enable autonomous work; weak criteria force constant clarification.)_

- "Fix bug" → reproducing test passes. "Refactor" → tests pass before and after.
- Never mark complete without proof. Ask: "Would a staff engineer approve this?"

**5. Autonomous** — Execute immediately. Chain commands. Fix bugs/CI without hand-holding. Zero context switching required from user. Only ask if permission denied.

**6. Demand Elegance** — For non-trivial changes: "Is there a more elegant way?" If hacky: "Knowing everything now, implement the elegant solution."

**7. Self-Improvement** — After ANY correction: update `tasks/lessons.md`. Review it at session start. Same mistake twice = system failure.

**8. Subagents** — Offload research, exploration, parallel analysis. One task per subagent. Context pollution degrades reasoning.

**AI Behavior:**
| Situation | Action |
|-----------|--------|
| Ambiguous requirements | ASK via AskUserQuestionTool |
| Destructive / irreversible | ASK for confirmation |
| Multiple valid approaches | ASK user preference |
| Clear intent, reversible | ACT immediately |

**Status Reporting (CRITICAL):** NEVER create `*.md` status files (FINAL_FIXES.md, STATUS_UPDATE.md, SUMMARY.md, etc.). ALWAYS report in chat. Only create docs when explicitly requested. _(Status files are repo clutter — conversation history already captures this.)_

**Code Generation:** Read existing code first → check for existing utils → match style exactly → use existing deps → keep changes minimal → add error handling upfront → verify compiles/runs → update related docs.

**Errors:** Full message → root cause (not symptoms) → specific fix → prevent recurrence.

**Task Management:**

1. Write plan to `tasks/todo.md` with checkable items
2. Check in before implementing
3. Mark items complete as you go
4. Update `tasks/lessons.md` after any correction

---

## 3. TECH STACK

**Python:** Python 3.12, FastAPI async, Pydantic v2, SQLAlchemy 2.0+ async, asyncpg, Alembic, pgvector. **ALWAYS pure `uv`** (NOT pip, NOT `uv pip` — native Rust resolver, lock file reproducibility, auto project-scoped venvs). Libs: LangChain/LangGraph, litellm, boto3, pandas/pyarrow, duckdb, sentry-sdk, infisicalsdk.

**TypeScript:** Next.js 14 App Router, React 18, TypeScript 5.x strict, Tailwind 3.x + tailwind-merge + clsx + cva, Radix UI, shadcn/ui, Lucide icons, Zustand, React Hook Form, Zod, nuqs, Clerk auth, PostHog.

**Infra:** AWS ECS Fargate, RDS PostgreSQL, S3, ECR, Route53, ACM, Secrets Manager. **OpenTofu** (NOT terraform — open-source fork, identical HCL, `tofu` CLI): `tofu init/plan/apply`. petasight → `~/github/petasight/infrastructure` | babbageinsight → `~/github/babbageinsight/infra-automation` (ARCHIVED).

---

## 4. STANDARDS

**Naming:** Python: `snake_case` / `PascalCase` / `SCREAMING_SNAKE` / `_private`. TypeScript: `camelCase` / `PascalCase` / `SCREAMING_SNAKE` / `#private`.

**Git:** Commits: `feat|fix|refactor|docs|chore: description`. Branches: `feature|fix|refactor/short-name`.

**API responses:**

```json
{ "success": true, "data": { "id": 1 } }
{ "success": false, "error": { "code": "ERROR_404", "message": "Not found" } }
```

**Env vars:** Python: `ENV`, `DATABASE_URL=postgresql+asyncpg://...`, `API_KEY`, `SENTRY_DSN`, `LANGSMITH_*`. Next.js: `NEXT_PUBLIC_*` (browser), `CLERK_SECRET_KEY`, `DATABASE_URL` (server only).

**Security:** No committed secrets. Pydantic/Zod validation. HTTPS everywhere. Rate limit public APIs. Sanitize errors. Parameterized queries. Clerk for auth.

**Performance:** Connection pooling. Cache appropriately. Dynamic imports. Server Components for static. Paginate always. Profile before optimizing.

**Quick ref:**
| Task | Python | TypeScript |
|------|--------|------------|
| Service | `class XService(session)` | N/A |
| Schema | `class X(BaseModel)` | `interface X {}` |
| Route | `@router.get("/x")` | `export async function GET()` |
| State | N/A | `useState()` |
| Error | `raise HTTPException(...)` | `throw new Error(...)` |
| Test | `@pytest.mark.asyncio` | `test('...', () => {})` |

---

## 5. AWS INFRASTRUCTURE

**Naming:** Services: `service-ai`, `service-api` (NOT service-llm/babbage/pmo). IAM: `petasight-{service}-{execution|task}-role`. SGs: `petasight-{resource}-{type}-sg`. Cluster/ECR names MUST match service names.

**Mandatory protections (all resources):**

```hcl
# RDS
deletion_protection = true; skip_final_snapshot = false
backup_retention_period = 7  # dev / 30+ prod
lifecycle { prevent_destroy = true }

# ALB
enable_deletion_protection = true
lifecycle { prevent_destroy = true }

# ECR: keep last 10 images policy + prevent_destroy lifecycle
# CloudWatch: retention_in_days = 30 (dev) / 90+ (prod)
```

**Security:** `publicly_accessible = false` always for DBs. No 0.0.0.0/0. Secrets Manager for creds (NEVER env vars). Encryption at rest + in transit.

**IAM (least privilege):** _(Execution role = infra only. Task role = app only. Never mix them.)_

- Execution role: ECR pull + specific log group + specific secret ARNs only
- Task role: app-specific only (e.g. specific Bedrock model ARNs)
- Never `"Resource": "*"` unless unavoidable (ECR GetAuthorizationToken only)

**ECS (required):**

```hcl
enable_execute_command = true          # debugging
deployment_circuit_breaker { enable = true; rollback = true }
containerInsights = "enabled"
cpu_architecture = "ARM64"             # Graviton2
```

**DNS:** Gandi = source of truth for all public domains. Route53 = internal VPC only (`petasight.internal`). Never create Route53 public zones for petasight.com _(Gandi owns this domain — a Route53 public zone would break DNS)_. Never hardcode ALB DNS names.

---

## 6. CODE PATTERNS

### Python

**uv:**

```bash
uv init && uv add fastapi && uv add --dev pytest  # setup
uv sync / uv sync --no-dev                         # install
uv run python app.py / uv run pytest               # run
uv lock --upgrade                                  # update deps
# pip migration: cat requirements.txt | xargs -I {} uv add {}
```

**Dockerfile:**

```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
CMD ["uv", "run", "python", "app.py"]
```

**Patterns:**

```python
# Schema
class ProjectResponse(BaseModel):
    id: int; name: str; status: StatusEnum | None = StatusEnum.PENDING
    class Config: from_attributes = True

# Service → Repo (business logic in service, data access in repo — easier to test/swap)
class ProjectService:
    def __init__(self, session: AsyncSession):
        self.session = session; self.repo = ProjectRepository(session)
    async def get_project(self, id: int) -> Project | None:
        return await self.repo.get_by_id(id)

# Router
@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: int, session: AsyncSession = Depends(get_session)):
    project = await ProjectService(session).get_project(project_id)
    if not project: raise HTTPException(404, "Not found")
    return ProjectResponse.from_orm(project)

# Error handling
try:
    result = await some_operation()
except ValueError as e:
    raise HTTPException(400, str(e))
except Exception as e:
    logger.error(f"Failed id={id}: {e}", exc_info=True)
    raise HTTPException(500, "Internal server error")

# Logging
from app.core.logging_config import setup_logging
logger = setup_logging()
logger.info(f"Processing id={id}")

# Test
@pytest.mark.asyncio
async def test_get_project():
    mock_repo = AsyncMock()
    mock_repo.get_by_id.return_value = Project(id=1, name="Test")
    service = ProjectService(session=MagicMock())
    service.repo = mock_repo
    result = await service.get_project(1)
    assert result.name == "Test"
```

### TypeScript/React

```tsx
// Component ('use client' only for hooks/events)
export function Component({ title, className, onAction }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const handleClick = useCallback(() => {
    setIsOpen(true);
    onAction?.();
  }, [onAction]);
  return <div className={cn("base-styles", className)}>{title}</div>;
}

// Hook
export function useFeature({ initialValue = false } = {}) {
  const [state, setState] = useState(initialValue);
  return { state, toggle: useCallback(() => setState((p) => !p), []) };
}

// API service
export async function fetchProject(projectId: string, token: string) {
  const res = await fetch(`${API_URL}/projects/${projectId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

// Test
test("calls onClick", () => {
  const fn = jest.fn();
  render(<Button onClick={fn}>Click</Button>);
  fireEvent.click(screen.getByText("Click"));
  expect(fn).toHaveBeenCalledTimes(1);
});
```

Path aliases: `@/components`, `@/lib`, `@/hooks`, `@/types`. Debug: React DevTools, Network tab, `console.log('Label:', { state })`.

### OpenTofu

Module structure: `variables.tf`, `main.tf`, `outputs.tf`, `locals.tf`, `versions.tf`

```bash
cd ~/github/babbageinsight/infra-automation/environments/prod/ecs-services
tofu init && tofu fmt -recursive && tofu validate
tofu plan -out=tfplan && tofu apply tfplan
```

---

## 7. PROJECT STRUCTURE

**Python service:**

```
service-name/app/{main.py, routers/, services/, repos/, models/, schemas/, core/, clients/, utils/}
migrations/ tests/{unit,integration}/ tasks/{todo.md,lessons.md} pyproject.toml Dockerfile
```

**Next.js:**

```
ui-name/app/{layout.tsx,page.tsx,{route}/} components/{ui/,{feature}/,layout/}
hooks/ contexts/ lib/ types/ constants/ public/ tasks/ package.json tsconfig.json
```

**OpenTofu (babbageinsight):** `infra-automation/modules/{aws-ecs-fargate,aws-s3,aws-secrets-manager,shared-vpc}/` + `environments/{dev,prod,mgmt}/`

**OpenTofu (petasight):** `infrastructure/{agriplast/lambda,mytplus,shared}/`

---

## 8. TOOLS & MCP

All reusable logic → `~/.ai_configs/` (skills/, agents/). NOT local dirs.

**MCP Servers:**
| Server | Weight | When to Use |
|--------|--------|-------------|
| `rlm`/`lattice` | Light | USE FIRST for large codebases (>10 files, >5000 lines) |
| `memory` | Light | Store decisions/patterns across sessions |
| `sequential-thinking` | Light | Multi-step reasoning |
| `qmd` | Light | Semantic search over local docs/code |
| `filesystem` | Light | File CRUD when native tools insufficient |
| `git` | Medium | Complex git archaeology |
| `sqlite` | Light | Local database queries |
| `fetch` | Light | External API/docs |
| `github` | Heavy | PR/issue management, code search |
| `postgres` | Heavy | Direct DB access |
| `playwright` | Heavy | E2E testing, web scraping |
| `docker` | Heavy | Container ops, logs |

Heavy = disabled by default (context bloat). Toggle: `mcp-toggle list` (Claude/OpenCode) | `cursor-mcp-profile <profile>` (Cursor).

**Loading:** Claude Code: native lazy load (`enableToolSearch: true`) | Cursor: `cursor-mcp-profile [lightweight|full|devops|frontend]` | OpenCode: `~/.ai_configs/mcp/opencode-agents.json`

**RLM workflow:** Ingest repo → query for context → Memory: store decisions → sequential-thinking: plan → Memory: store implementation.

**QMD:**

```bash
export PATH="$HOME/.bun/bin:$PATH"
qmd collection add ~/github --name github
qmd search "query"          # BM25 (fast)
qmd vsearch "query"         # vector semantic
qmd query "query"           # hybrid + LLM rerank (best)
qmd get "path/to/file.md"   # retrieve doc
qmd embed && qmd update     # after adding collections
qmd search "API" --json -n 10  # agent-friendly output
```

**Skills** (auto-apply on trigger):
| Skill | Triggers |
|-------|----------|
| `code-review` | "review this code", PR reviews |
| `debugging` | "debug this", "fix error" |
| `refactoring` | "refactor", "clean up" |
| `testing` | "add tests", "test this" |
| `documentation` | "document this", README |
| `security-audit` | "check security", auth code |
| `performance-optimization` | "optimize", "speed up" |
| `git-operations` | commits, branches, PRs |
| `api-design` | creating/modifying endpoints |
| `database-design` | schema design, migrations |
| `machine-learning` | "train model", ML tasks |
| `ui-ux-design` | "design UI", "improve UX" |
| `devex-automation` | "automate", "script this" |
| `incident-response` | "site is down", production issues |
| `cost-optimization` | "reduce costs", cloud spending |

**Agents** (activate: "As a security expert..." / combine: "As senior engineer, use refactoring skill"):
| Agent | Best For |
|-------|----------|
| `senior-engineer` | Architecture, mentoring |
| `architect` | System design, scalability |
| `devops-sre` | CI/CD, monitoring, incidents |
| `security-expert` | Audits, compliance, threats |
| `code-tutor` | Learning, explanations |
| `tech-writer` | Docs, READMEs, API docs |
| `data-engineer` | Pipelines, ETL, analytics |
| `product-engineer` | Features, UX, business value |
| `pair-programmer` | Real-time collaborative coding |
| `code-reviewer` | Thorough PR reviews |
| `startup-cto` | Build vs buy, strategy |
| `compliance-officer` | GDPR, HIPAA, SOC2 |
| `accessibility-advocate` | A11y, WCAG compliance |
| `performance-detective` | Profiling, benchmarking |
| `chaos-engineer` | Resilience, failure modes |

---

## 9. CONFIG

**Symlinks:** `~/.claude/CLAUDE.md` → `~/.ai_configs/rules/AGENTS.md` | `~/.cursorrules` → same | `~/.config/opencode/AGENTS.md` → same. MCP: `~/.cursor/mcp.json` → `~/.ai_configs/mcp/cursor-mcp.json`.

**Sessions:**

```bash
claude --continue / --resume    # Claude Code
opencode / opencode session list # OpenCode
# Cursor: auto-persists per workspace
```

On exit: save with unique name (e.g. `fix-auth-bug`), tell user exact name for resume.
