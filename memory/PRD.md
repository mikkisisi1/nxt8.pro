# NXT8 — Product Requirements Document

**Version:** 0.2 (MVP + Voice module)
**Last updated:** 2026-05-16
**Status:** MVP backend + UI live · Voice module (Whisper STT + OpenAI TTS) integrated · DeepSeek still in mock fallback (HTTP 402 — user is topping up balance)

---

## 1. Original problem statement (user verbatim)

> Создать AI-native операционную систему для компаний (NXT8), которая:
> - не требует от сотрудников промпт-инжиниринга
> - объединяет AI-инструменты в единый интеллектуальный слой
> - обладает корпоративной памятью
> - объясняет свои решения (confidence + verification)
> - измеряет ROI в реальном времени
> - использует DeepSeek как единое ядро

Provided ТЗ in 16 files (`xcod 0..14`) covering 10 modules + design HTML.

## 2. User-confirmed decisions

| # | Choice | Decision |
|---|--------|----------|
| 1 | LLM core | **1a** — DeepSeek API direct, key delivered later |
| 2 | Deployment | **2a** — single FastAPI + React + MongoDB; agents = internal modules |
| 3 | MVP scope | **3b** — Orchestrator + Memory + Reliability + Mentor + ROI + UI |
| 4 | UI design | **4a** — port HTML mockup 1:1 (dark + turquoise + LED matrix) |
| 5 | Voice | **5b** — stub for MVP, real impl in next phase |

## 3. Architecture (as built)

Single FastAPI process on :8001 with /api prefix routes; React on :3000.

```
/app/backend/
├── server.py                 FastAPI app, lifespan, /api router
├── core/
│   ├── deepseek.py           DeepSeek client w/ logprob→confidence + mock mode
│   └── db.py                 Motor MongoDB, ensure_indexes()
└── agents/
    ├── orchestrator.py       intent classify → dispatch → reliability → audit
    ├── memory.py             short-term (sessions) + long-term (TF-IDF semantic)
    ├── reliability.py        confidence + contradiction + hallucination
    ├── mentor.py             5 levels, weak patterns, recommendations
    └── roi.py                cost tracking + time-decay revenue attribution + hourly ROI

/app/frontend/src/
├── App.js                    6-view router (home/cmd/agents/map/alerts/mic)
├── components/
│   ├── TopTicker.jsx, Header.jsx, BottomNav.jsx
│   └── views/{Home,Chat,Agents,Map,Alerts,Mic}View.jsx
├── lib/api.js                axios → REACT_APP_BACKEND_URL/api
└── index.css                 LED-matrix bg, glass-card, glow, neo-btn
```

## 4. Implemented modules (8/14)

- ✅ **Core** — FastAPI, MongoDB, supervisor (no PostgreSQL/Redis — emergent constraint)
- ✅ **Orchestrator** — `POST /api/chat` intent-routing pipeline
- ✅ **Memory** — short-term (Mongo sessions, 24h cleanup) + long-term (TF-IDF cosine, ranking via recency/importance)
- ✅ **Reliability** — confidence weighted (deepseek 0.5 / source 0.2 / evidence 0.2 / consistency 0.1); contradiction & hallucination check via TF-IDF cosine
- ✅ **Mentor** — 5 levels (junior/mid/senior/lead/strategist), targets/weights per level, weak patterns (low_accuracy/high_escalation/repeating_errors)
- ✅ **ROI** — cost tracking ($0.50/1M tokens, $0.05/cpu-hour, $35/h escalation), revenue attribution `1/(days+1)` over 7 days, hourly snapshots, alerts
- ✅ **Voice** *(2026-05-16)* — Whisper STT + OpenAI TTS via Emergent Universal LLM Key, one-shot `/voice/converse` STT→chat→TTS loop, hold-to-talk MicView with waveform meter
- ✅ **UI** — 6 views, 1:1 mobile mockup port, data-testids on every interactive element

## 5. Deferred to next phases

- ⏳ Cross-Department Coordinator (file `install_cross_dept.sh`)
- ⏳ Skill Creator (file `install_skill_creator.sh`)
- ⏳ Market Radar (file `install_market_radar.sh`)
- ⏳ Diagnostics / contradiction classifier (file `install_diagnostics.sh`)
- ⏳ Production observability (Prometheus + Grafana from `install_finalize.sh`)

## 6. API surface (verified)

```
GET   /api/health
POST  /api/seed                              (idempotent demo seed)
POST  /api/chat                              (main pipeline)
GET   /api/requests                          (audit log)
GET   /api/sessions/{session_id}

POST  /api/memory/store
POST  /api/memory/search
GET   /api/memory/list

POST  /api/reliability/assess

POST/GET  /api/mentor/employees
GET   /api/mentor/employees/{id}
POST  /api/mentor/performance
POST  /api/mentor/detect/{id}
GET   /api/mentor/patterns
GET   /api/mentor/recommend/{id}/{pattern}

GET   /api/roi/dashboard
GET   /api/roi/current
GET   /api/roi/trend?hours=
POST  /api/roi/deals
POST  /api/roi/interactions

GET   /api/alerts

POST  /api/voice/stt        (multipart audio → Whisper transcript)
POST  /api/voice/tts        (JSON {text,voice,speed} → audio/mpeg MP3)
POST  /api/voice/converse   (multipart audio → STT→orchestrator→TTS, audio_b64 mp3 in JSON)
```

## 7. Current state / test results

- Backend: **25/25 pytest** pass (testing agent iter_2, re-run after OpenRouter switch)
- Frontend: 100% of required flows verified, all 6 views render; MicView wired with MediaRecorder
- LLM: **LIVE** via OpenRouter primary (`deepseek/deepseek-chat-v3-0324`) with direct DeepSeek fallback. Real logprob-based confidence scoring (no heuristic). Typical latency 3-7 sec.
- Voice: **LIVE** via Emergent Universal LLM Key (`EMERGENT_LLM_KEY`), whisper-1 STT + tts-1 MP3 output verified end-to-end
- `/api/health` exposes `deepseek.active_provider` and `deepseek.providers` for diagnostics
- Seed produces 6 corporate memories, 4 employees, 4 deals, weak patterns for Junior Lee

## 8. Backlog / next tasks

**P1:**
- Cross-Department Coordinator (port `install_cross_dept.sh` to internal module)
- Diagnostics module (contradiction classifier on logs)

**P2:**
- Skill Creator + Market Radar (self-improvement loop)
- Grafana dashboards / Prometheus metrics
- Multi-tenant company scoping
- Slack / WhatsApp channel adapters
- Voice activity detection (auto start/stop based on silence) — make voice UI fully "invisible"

## 9. Personas

- **Operator / Manager** — uses HOME (tasks), AGENTS (mentor reviews), MAP (ROI), ALERTS
- **End user / employee** — uses CMD (chat) for knowledge questions, task scheduling
- **Executive** — MAP view shows hourly ROI, cost-by-agent, trend
- **Admin / Eng** — uses /api/seed, /api/requests audit log, /api/health
