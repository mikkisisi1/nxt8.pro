# NXT8 — Release Notes

## v1.3.0-ultra — 2026-05-17

**Status:** ✅ Hermes Ultra COO Agent on LangGraph live. 17/17 backend tests green (iter_6.json).

### What changed
- **LangGraph 1.2.0** installed (+ langchain-core 1.4.0, langgraph-checkpoint, langgraph-prebuilt).
- New module **`backend/agents/hermes_max_tools_and_coo.py`** — `HERMES_TOOLS` dict with 10 tools:
  - **Real (5):** `search_memory`, `create_task`, `update_task`, `monitor_sla_violations`, `create_cross_department_bridge`
  - **Stub (5, `mock=true`):** `generate_communication_summary`, `suggest_next_best_action`, `find_opportunities_in_contact`, `suggest_reply_template`, `evaluate_action_roi`
  - `hermes_coo_chat()` with strong COO system prompt and explicit ```json {"tool":"name","args":{...}}``` format instruction.
- New module **`backend/nxt8_langgraph_ultra.py`** — `StateGraph` orchestrator: `supervisor → hermes → tools → human_approval → supervisor`. MAX_ITER=3 + critical-action gate (`create_task`/`update_task`/`create_cross_department_bridge` in `controlled_automation` require human approval). `_extract_tool_calls` regex parses fenced JSON blocks. MemorySaver checkpointer keyed by `thread_id = session_id`.
- New endpoint **`POST /api/hermes/ultra`** `{message, company_id?, user_id?, session_id?, autonomy_level: read_only|assistant|controlled_automation}` → `{success, content, autonomy_level, thread_id, iterations, confidence, tool_traces[], requires_human_approval, fallback?}`. Persists turns via `memory.append_message`. Invalid `autonomy_level` falls back to `"assistant"`. Graceful fallback to `hermes_coo_chat()` if LangGraph fails.
- v1.2.0 endpoints (`/api/hermes/chat`, `/api/hermes/daily-digest`) preserved and tested — no regressions.
- New pytest suite: `/app/backend/tests/test_hermes_ultra.py` (17 tests).

### Known limitations
- DeepSeek `:free` is non-deterministic about emitting ```json {tool, args}``` blocks; tool execution path is therefore validated via unit tests with crafted assistant content (not solely via LLM behavior).
- `human_approval` node is a pilot stub — surfaces pending actions but doesn't block for out-of-band signal. Real production approval flow is a P2 backlog item.
- Hermes gateway (:8642) still offline in preview — Ultra runs purely on DeepSeek + LangGraph (this is by design for the pilot).

---

## v1.2.0-hermes-coo — 2026-05-16

**Status:** ✅ Hermes upgraded to COO Agent with function-calling and multi-tenant context.

### What changed
- New module **`backend/agents/hermes_coo.py`** — enhanced reasoning layer on top of `hermes_proxy` with strong COO system prompt, 4 function-calling tools and a backend dispatcher with real side-effects.
- `POST /api/hermes/chat` replaced: now accepts `{messages, company_id?, user_id?, mode?, temperature?, model?}` and returns `{content, tool_calls[], iterations, company_id, ...}`.
- `POST /api/hermes/daily-digest` added: `{company_id?, user_id, period?}` — triggers digest generation via the `generate_daily_digest` tool.
- 4 tools implemented end-to-end (real DB writes/reads):
  - `search_memory` → `MemoryEngine.search`
  - `create_followup` → MongoDB collection `followups` (new)
  - `detect_bottlenecks` → `diagnostics.summary` + open followups
  - `generate_daily_digest` → 24h/7d aggregation of requests + followups + diagnostics
- Multi-tenant ready: optional `company_id` (fallback `"default"`) propagated through prompts and persisted on followups.
- Graceful fallback to DeepSeek when the Hermes gateway (:8642) is offline — endpoint stays available, tools just aren't auto-invoked in that mode.

### Smoke tests (curl + standalone Python)
- `GET  /api/hermes/health` → offline (gateway not started in preview), expected.
- `POST /api/hermes/chat` → 200, COO-formatted response via DeepSeek fallback.
- `POST /api/hermes/daily-digest` → 200, same path.
- Standalone tool dispatcher: all 4 tools return `ok=True`; followup persisted in MongoDB, digest aggregated 72 recent requests / 1 open followup.

### Known limitations
- Tool calls only execute automatically when the Hermes gateway on :8642 is running (it supports OpenAI-style `tools`). DeepSeek fallback returns the COO answer but does not auto-invoke tools.
- `company_id` is propagated but not yet schema-enforced on all collections (multi-tenant remains a P2 backlog item).

---

## v1.1.0-hermes — 2026-05-16 (additive)

**Status:** ✅ Module 15 (Hermes Agent) added without breaking pilot zero.

### What changed
- New module **Hermes Agent (NousResearch v0.13.0)** — installed in isolated venv `/opt/hermes-venv` (no conflict with NXT8 `openai==1.99.9` pin needed by emergentintegrations/voice)
- Hermes gateway runs as supervisor program `hermes-gateway` on `127.0.0.1:8642` with `API_SERVER_ENABLED=true`, `GATEWAY_ALLOW_ALL_USERS=true`, OpenRouter as model provider
- NXT8 backend proxy router `/api/hermes/{health,chat,jobs}` — async httpx forwarder with graceful 502 fallback (never raises into FastAPI handler)
- New OPS dashboard widget `hermes · agent` + drill-down `HermesPanel` (5th module)
- 3 new backend tests + 7 new frontend tests — **41/41 backend + 28/28 frontend** all green
- Modules 11-14 (cross_dept/diagnostics/skills/market) untouched — Hermes is purely additive

### Env added to `/app/backend/.env`
```
HERMES_BASE_URL=http://127.0.0.1:8642
HERMES_API_KEY=<auto-generated>
```

### Hermes config at `/opt/hermes-home/.env`
```
API_SERVER_ENABLED=true
API_SERVER_PORT=8642
API_SERVER_HOST=127.0.0.1
API_SERVER_KEY=<bearer>
OPENROUTER_API_KEY=<same as NXT8>
```

### Known limitations
- POST `/api/hermes/jobs` requires a valid cron schedule (Hermes side); without one Hermes returns 400 and proxy reports `ok:false` — UI handles gracefully
- aiohttp installed via `pip install 'hermes-agent[web]'` extra (required for API server)

---

## v1.0.0-pilot-zero — 2026-05-16

**Status:** ✅ Production-ready for Pilot Zero deployment

### Live integrations
| Сервис | Состояние | Модель/детали |
|--------|-----------|---------------|
| LLM core (text + reasoning + logprobs) | LIVE | OpenRouter → `deepseek/deepseek-chat-v3-0324` (fallback: DeepSeek Direct) |
| STT | LIVE | Whisper-1 via Emergent Universal Key |
| TTS | LIVE | OpenAI tts-1 (nova voice) via Emergent Universal Key |
| MongoDB | LIVE | Motor async, indexes ensured at boot |
| Streaming chat | LIVE | SSE `/api/chat/stream` (meta/delta/done frames) |
| Hourly scheduler | ON | ROI + session cleanup + diagnostics + skill discovery |

### Modules shipped (10/10)
1. **Orchestrator** — intent classify → dispatch → reliability → audit
2. **Memory** — short-term sessions + long-term TF-IDF semantic search
3. **Reliability** — confidence + contradiction + hallucination signals
4. **Mentor** — 5 levels, weak-pattern detection, recommendations
5. **ROI** — cost tracking + time-decay revenue attribution + hourly snapshots
6. **Voice** — STT + TTS + one-shot converse loop
7. **Cross-Department Coordinator** — multi-dept fan-out + DeepSeek synthesis
8. **Diagnostics** — TF-IDF contradiction scan + noisy-intent ranking
9. **Skill Creator** — auto-registration of recurring (intent, signature) patterns
10. **Market Radar** — signal ingestion + 24h digest synthesis

### Frontend (7 views)
- HOME — tasks + pipeline + ROI mini-cards
- CMD — streaming chat (token-by-token, confidence chips)
- **OPS** — cockpit dashboard with 4 drill-down panels (cross-dept / diagnostics / skills / market)
- AGENTS — mentor roster + weak-pattern badges + employee detail
- MAP — ROI hourly map + cost-by-agent bars + 24h trend
- ALERTS — severity-tinted feed
- MIC — hold-to-talk voice converse loop

### Test coverage
- Backend: **38/38** pytest (iteration_3.json)
- Frontend Ops Dashboard: **21/21** E2E (iteration_4.json)
- LLM live latency: 1.5–7 s end-to-end, 1.5–3 s first-token (streaming)

### Known limitations (intentionally deferred → post-pilot)
- No auth / multi-tenancy (single-org pilot mode)
- No external news feed (Market Radar relies on manual ingest + seed)
- No Slack/WhatsApp adapters (web + REST API only)
- Voice Activity Detection — manual hold-to-talk only
- Executive Report export — to be added in parallel with observability

### Pilot-blocking issues
None.

---

## Earlier checkpoints

### v0.3 — 2026-05-15
- Voice module + MicView + SSE streaming + 4 new backend modules (cross-dept, diagnostics, skills, market). Backend complete; frontend missing Ops dashboard.

### v0.2 — 2026-05-14
- OpenRouter migration (resolved 402 from direct DeepSeek). Logprobs active.

### v0.1 — 2026-05-13
- Initial MVP: 5 modules + 5 views + LED-matrix design ported from HTML mockup.
