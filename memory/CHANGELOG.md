# NXT8 — Release Notes

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
