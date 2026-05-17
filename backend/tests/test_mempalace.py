"""
MemPalace integration tests (Iter 7).

Covers:
- /api/mempalace/health
- /api/mempalace/store (UTF-8, empty content, concurrency)
- /api/mempalace/search (semantic, filtering by wing/room, empty query, top_k bounds)
- /api/mempalace/wings (aggregation)
- Regression: /api/chat/stream SSE + auto-write to wing=chats/room={session_id}
- Regression: /api/health, /api/memory/store, /api/memory/search, /api/chat (non-stream), /api/hermes/chat
"""
from __future__ import annotations

import os
import re
import json
import time
import uuid
import asyncio
import concurrent.futures
import urllib.parse

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

# --- shared session ---------------------------------------------------------

@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def test_tag():
    # Unique tag so we can isolate this run's data when searching
    return f"TEST_mempalace_{uuid.uuid4().hex[:8]}"


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

class TestHealth:
    def test_mempalace_health(self, api):
        r = api.get(f"{BASE_URL}/api/mempalace/health", timeout=30)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data.get("ok") is True
        assert data.get("enabled") is True
        assert "palace_path" in data and isinstance(data["palace_path"], str)
        assert "drawer_count" in data and isinstance(data["drawer_count"], int)
        assert data["drawer_count"] >= 0

    def test_app_health(self, api):
        r = api.get(f"{BASE_URL}/api/health", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("status") == "ok"
        assert d.get("mongo") is True


# ---------------------------------------------------------------------------
# Store
# ---------------------------------------------------------------------------

class TestStore:
    def test_store_basic_russian_utf8(self, api, test_tag):
        payload = {
            "content": f"{test_tag} — НXT8 это AI-операционная система с долговременной памятью.",
            "wing": "internal",
            "room": "general",
            "metadata": {"tag": test_tag, "lang": "ru"},
        }
        r = api.post(f"{BASE_URL}/api/mempalace/store", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is True
        assert d.get("wing") == "internal"
        assert d.get("room") == "general"
        assert isinstance(d.get("source_file"), str) and d["source_file"].startswith("nxt8://internal/general/")
        assert isinstance(d.get("metadata"), dict)
        assert d["metadata"].get("tag") == test_tag

    def test_store_safe_name_sanitisation(self, api, test_tag):
        # Spaces and unicode should be sanitised into A-Za-z0-9_-
        payload = {
            "content": f"{test_tag} клиент ACME с проектом",
            "wing": "Clients Wing!",
            "room": "ACME Corp 2026",
            "metadata": {"tag": test_tag},
        }
        r = api.post(f"{BASE_URL}/api/mempalace/store", json=payload, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        # _safe_name lowercases and replaces invalid chars with _
        assert re.fullmatch(r"[a-z0-9_\-]+", d["wing"]), d["wing"]
        assert re.fullmatch(r"[a-z0-9_\-]+", d["room"]), d["room"]

    def test_store_empty_content_rejected(self, api):
        r = api.post(
            f"{BASE_URL}/api/mempalace/store",
            json={"content": "   ", "wing": "internal", "room": "general"},
            timeout=15,
        )
        # bridge returns {ok: False, error: "empty content"} with 200
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("ok") is False
        assert "empty" in (d.get("error") or "").lower()

    def test_store_missing_content_422(self, api):
        # Pydantic validation: content field required
        r = api.post(f"{BASE_URL}/api/mempalace/store", json={"wing": "internal"}, timeout=15)
        assert r.status_code == 422

    def test_store_concurrent(self, api, test_tag):
        """Fire 5 concurrent stores; all must succeed and the drawer_count must grow."""
        h0 = api.get(f"{BASE_URL}/api/mempalace/health", timeout=15).json()
        c0 = h0["drawer_count"]

        def _one(i):
            return api.post(
                f"{BASE_URL}/api/mempalace/store",
                json={
                    "content": f"{test_tag} concurrent {i} — параллельный тест номер {i}.",
                    "wing": "internal",
                    "room": "concurrency",
                    "metadata": {"tag": test_tag, "i": i},
                },
                timeout=30,
            )

        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as ex:
            results = list(ex.map(_one, range(5)))
        for r in results:
            assert r.status_code == 200, r.text
            assert r.json().get("ok") is True

        # health drawer_count should be >= c0 + 5
        # (give chroma a moment to flush)
        time.sleep(1.0)
        h1 = api.get(f"{BASE_URL}/api/mempalace/health", timeout=15).json()
        assert h1["drawer_count"] >= c0 + 5, (c0, h1["drawer_count"])


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

class TestSearch:
    @pytest.fixture(scope="class")
    def seeded(self, api):
        """Seed a few well-known drawers in distinct wings for filtering tests."""
        tag = f"TEST_search_{uuid.uuid4().hex[:8]}"
        seeds = [
            ("clients", "acme", f"{tag} клиент ACME занимается логистикой и складами в Москве."),
            ("clients", "globex", f"{tag} клиент Globex — крупный производитель чипсетов."),
            ("projects", "alpha", f"{tag} проект Alpha — внедрение AI-агентов в продажи."),
            ("employees", "ivanov", f"{tag} сотрудник Иванов отвечает за безопасность и compliance."),
        ]
        for wing, room, content in seeds:
            r = api.post(
                f"{BASE_URL}/api/mempalace/store",
                json={"content": content, "wing": wing, "room": room, "metadata": {"tag": tag}},
                timeout=30,
            )
            assert r.status_code == 200 and r.json().get("ok") is True, r.text
        # Give ChromaDB a moment to index
        time.sleep(1.0)
        return tag

    def test_search_semantic_returns_results(self, api, seeded):
        r = api.post(
            f"{BASE_URL}/api/mempalace/search",
            json={"query": "логистика и склады", "top_k": 5},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("count"), int)
        assert isinstance(d.get("results"), list)
        assert d["count"] == len(d["results"])
        assert d["count"] >= 1, "Expected at least one semantic match for 'логистика и склады'"
        first = d["results"][0]
        for k in ("id", "content", "wing", "room", "similarity", "distance", "metadata"):
            assert k in first, f"missing key {k} in result"
        # similarity should be a float in [0,1]
        assert isinstance(first["similarity"], (int, float))
        assert 0.0 <= float(first["similarity"]) <= 1.0
        # results sorted by similarity desc
        sims = [r["similarity"] for r in d["results"] if r.get("similarity") is not None]
        assert sims == sorted(sims, reverse=True), f"results not sorted desc by similarity: {sims}"

    def test_search_similarity_equals_one_minus_distance(self, api, seeded):
        r = api.post(
            f"{BASE_URL}/api/mempalace/search",
            json={"query": "AI агенты продажи", "top_k": 3},
            timeout=60,
        )
        assert r.status_code == 200
        for item in r.json()["results"]:
            if item.get("distance") is not None and item.get("similarity") is not None:
                expected = max(0.0, min(1.0, 1.0 - float(item["distance"])))
                assert abs(float(item["similarity"]) - expected) < 1e-6

    def test_search_filter_by_wing(self, api, seeded):
        r = api.post(
            f"{BASE_URL}/api/mempalace/search",
            json={"query": "клиент", "wing": "clients", "top_k": 10},
            timeout=60,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["count"] >= 1
        for item in d["results"]:
            assert item["wing"] == "clients", f"wing filter leaked: {item['wing']}"

    def test_search_filter_by_wing_and_room(self, api, seeded):
        r = api.post(
            f"{BASE_URL}/api/mempalace/search",
            json={"query": "ACME", "wing": "clients", "room": "acme", "top_k": 10},
            timeout=60,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["count"] >= 1
        for item in d["results"]:
            assert item["wing"] == "clients"
            assert item["room"] == "acme"

    def test_search_empty_query(self, api):
        r = api.post(
            f"{BASE_URL}/api/mempalace/search",
            json={"query": "   ", "top_k": 5},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["count"] == 0
        assert d["results"] == []

    def test_search_top_k_respected(self, api, seeded):
        r = api.post(
            f"{BASE_URL}/api/mempalace/search",
            json={"query": "клиент проект сотрудник", "top_k": 2},
            timeout=60,
        )
        assert r.status_code == 200
        assert len(r.json()["results"]) <= 2


# ---------------------------------------------------------------------------
# Wings listing
# ---------------------------------------------------------------------------

class TestWings:
    def test_list_wings_structure(self, api):
        r = api.get(f"{BASE_URL}/api/mempalace/wings", timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("count"), int)
        assert isinstance(d.get("wings"), list)
        assert d["count"] == len(d["wings"])
        # After previous tests we expect at least 'internal' or 'clients' wings
        if d["wings"]:
            w = d["wings"][0]
            for k in ("wing", "drawer_count", "rooms"):
                assert k in w
            assert isinstance(w["rooms"], list)
            for room in w["rooms"]:
                assert "room" in room and "drawer_count" in room
            # drawer_count for a wing should equal sum of rooms' drawer_counts
            total = sum(r["drawer_count"] for r in w["rooms"])
            assert total == w["drawer_count"]


# ---------------------------------------------------------------------------
# Regression — /api/chat/stream auto-writes into MemPalace
# ---------------------------------------------------------------------------

class TestChatStreamAutosave:
    def test_chat_stream_writes_to_mempalace(self, api):
        session_id = f"sess_test_{uuid.uuid4().hex[:10]}"
        unique_phrase = f"турбонаддувом квантовым логистическим {uuid.uuid4().hex[:6]}"
        message = (
            f"Расскажи кратко про внутренний проект NXT8 с {unique_phrase}, "
            "это нужно для проверки автозаписи в долгую память."
        )
        payload = {"message": message, "session_id": session_id, "user_id": "TEST_user"}

        # Stream
        with api.post(
            f"{BASE_URL}/api/chat/stream",
            json=payload,
            stream=True,
            timeout=120,
            headers={"Accept": "text/event-stream"},
        ) as r:
            assert r.status_code == 200, r.text[:500] if hasattr(r, "text") else "stream err"
            saw_meta = saw_delta = saw_done = False
            for raw in r.iter_lines(decode_unicode=True):
                if raw is None:
                    continue
                if raw.startswith("event: meta"):
                    saw_meta = True
                elif raw.startswith("event: delta"):
                    saw_delta = True
                elif raw.startswith("event: done"):
                    saw_done = True
                    break
            assert saw_meta and saw_delta and saw_done, (saw_meta, saw_delta, saw_done)

        # auto-write is fire-and-forget; poll for it
        deadline = time.time() + 25
        found = None
        while time.time() < deadline:
            time.sleep(2)
            sr = api.post(
                f"{BASE_URL}/api/mempalace/search",
                json={"query": unique_phrase, "wing": "chats", "room": session_id, "top_k": 5},
                timeout=30,
            )
            assert sr.status_code == 200
            results = sr.json().get("results", [])
            if results:
                found = results[0]
                break
        assert found is not None, f"MemPalace autosave not found for session {session_id}"
        assert found["wing"] == "chats"
        assert found["room"] == session_id
        # content shape: "USER: ...\nASSISTANT: ..."
        assert "USER:" in (found["content"] or "")
        assert "ASSISTANT:" in (found["content"] or "")


# ---------------------------------------------------------------------------
# Regression — existing endpoints not broken
# ---------------------------------------------------------------------------

class TestRegression:
    def test_memory_store_and_search(self, api):
        sess = f"TEST_mem_{uuid.uuid4().hex[:8]}"
        # store
        r1 = api.post(
            f"{BASE_URL}/api/memory/store",
            json={
                "content": f"{sess} — компания NXT8 разрабатывает AI-операционную систему.",
                "session_id": sess,
                "memory_type": "fact",
            },
            timeout=20,
        )
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1.get("ok") is True or "id" in d1, d1

        time.sleep(0.5)
        # search
        r2 = api.post(
            f"{BASE_URL}/api/memory/search",
            json={"query": "NXT8 AI-операционная система", "top_k": 5},
            timeout=20,
        )
        assert r2.status_code == 200, r2.text
        d2 = r2.json()
        assert "results" in d2 and "count" in d2
        assert isinstance(d2["results"], list)

    def test_chat_non_stream(self, api):
        r = api.post(
            f"{BASE_URL}/api/chat",
            json={
                "message": "Скажи кратко: что такое NXT8?",
                "session_id": f"TEST_ns_{uuid.uuid4().hex[:8]}",
                "user_id": "TEST_user",
            },
            timeout=120,
        )
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        # response content must be present
        content = d.get("response") or d.get("content") or d.get("text") or ""
        assert isinstance(content, str) and len(content) > 0, d

    def test_hermes_chat(self, api):
        r = api.post(
            f"{BASE_URL}/api/hermes/chat",
            json={
                "message": "Привет, дай краткий статус.",
                "company_id": "TEST_co_regress",
                "user_id": "TEST_user",
                "session_id": f"TEST_hermes_{uuid.uuid4().hex[:8]}",
            },
            timeout=120,
        )
        assert r.status_code == 200, r.text[:500]
        d = r.json()
        # v1.2.0 contract: success + content
        assert "content" in d or "response" in d, list(d.keys())
