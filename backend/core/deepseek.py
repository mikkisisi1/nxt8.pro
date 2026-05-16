"""
DeepSeek API client for NXT8.

Implements the architectural principle "DeepSeek as single reasoning engine":
- Direct HTTP calls to api.deepseek.com (OpenAI-compatible)
- Confidence extraction from token logprobs
- Mock mode when API key is not configured (for offline dev / before key delivery)
"""

from __future__ import annotations

import math
import os
import random
import re
import logging
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger("nxt8.deepseek")

PLACEHOLDER_KEYS = {"", "your-key-here", "placeholder", "todo", "changeme"}


class DeepSeekClient:
    """Async DeepSeek client with logprob-based confidence and mock fallback."""

    def __init__(self) -> None:
        self.api_key: str = os.environ.get("DEEPSEEK_API_KEY", "").strip()
        self.base_url: str = os.environ.get(
            "DEEPSEEK_API_URL", "https://api.deepseek.com/v1"
        ).rstrip("/")
        self.model: str = os.environ.get("DEEPSEEK_MODEL", "deepseek-chat")
        self.mock_mode: bool = self.api_key.lower() in PLACEHOLDER_KEYS
        self.last_error: Optional[str] = None  # last live API error for diagnostics

        if self.mock_mode:
            logger.warning(
                "DeepSeek client running in MOCK mode (DEEPSEEK_API_KEY not set). "
                "All reasoning calls will return synthetic responses."
            )
        else:
            logger.info("DeepSeek client initialized with live API (%s)", self.base_url)

    async def chat(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        request_logprobs: bool = True,
    ) -> Dict[str, Any]:
        """Call chat completions. Returns dict with content, confidence, raw."""
        if self.mock_mode:
            return self._mock_response(messages)

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if request_logprobs:
            payload["logprobs"] = True
            payload["top_logprobs"] = 5

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                r = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPStatusError as e:
            status = e.response.status_code if e.response is not None else "?"
            reason = {
                401: "unauthorized (invalid DEEPSEEK_API_KEY)",
                402: "payment_required (top-up DeepSeek account balance)",
                429: "rate_limited",
                500: "deepseek_server_error",
            }.get(status, f"http_{status}")
            self.last_error = reason
            logger.error("DeepSeek call failed (%s) — falling back to mock", reason)
            return self._mock_response(messages, note=reason)
        except httpx.HTTPError as e:
            self.last_error = f"network_error: {e}"
            logger.error("DeepSeek network error: %s — falling back to mock", e)
            return self._mock_response(messages, note=self.last_error)

        self.last_error = None
        return self._parse(data)

    def _parse(self, data: Dict[str, Any]) -> Dict[str, Any]:
        choice = (data.get("choices") or [{}])[0]
        message = choice.get("message", {})
        content = (message.get("content") or "").strip()

        confidence = 0.7  # default if no logprobs
        logprobs = choice.get("logprobs") or {}
        token_data = logprobs.get("content") or []
        if token_data:
            # Confidence = exp(avg logprob of selected top tokens)
            lps = [
                t.get("logprob", 0.0)
                for t in token_data
                if isinstance(t, dict) and t.get("logprob") is not None
            ]
            if lps:
                avg = sum(lps) / len(lps)
                confidence = max(0.05, min(0.99, math.exp(avg)))

        usage = data.get("usage", {})
        return {
            "content": content,
            "confidence": confidence,
            "tokens_in": usage.get("prompt_tokens", 0),
            "tokens_out": usage.get("completion_tokens", 0),
            "tokens_total": usage.get("total_tokens", 0),
            "model": data.get("model", self.model),
            "mock": False,
        }

    def _mock_response(
        self, messages: List[Dict[str, str]], note: Optional[str] = None
    ) -> Dict[str, Any]:
        """Generate a plausible synthetic response for offline/dev mode."""
        last_user = next(
            (m.get("content", "") for m in reversed(messages) if m.get("role") == "user"),
            "",
        )
        system_prompt = next(
            (m.get("content", "") for m in messages if m.get("role") == "system"), ""
        )

        # Intent classifier mock
        if "Classify" in system_prompt or "classify" in system_prompt:
            content = self._mock_classify(last_user)
            return {
                "content": content,
                "confidence": 0.82,
                "tokens_in": 50,
                "tokens_out": 5,
                "tokens_total": 55,
                "model": "mock-deepseek",
                "mock": True,
                "note": note,
            }

        # General response mock
        content = self._mock_general(last_user)
        # Vary confidence to demo reliability gateway
        confidence = round(random.uniform(0.55, 0.92), 3)
        return {
            "content": content,
            "confidence": confidence,
            "tokens_in": max(20, len(last_user) // 4),
            "tokens_out": max(20, len(content) // 4),
            "tokens_total": max(40, (len(last_user) + len(content)) // 4),
            "model": "mock-deepseek",
            "mock": True,
            "note": note,
        }

    @staticmethod
    def _mock_classify(text: str) -> str:
        t = text.lower()
        if any(w in t for w in ["roi", "выручк", "доход", "стоимост", "cost", "revenue"]):
            return "roi"
        if any(w in t for w in ["сотрудник", "ментор", "обуч", "training", "employee"]):
            return "mentor"
        if any(w in t for w in ["задача", "task", "запланир", "schedule"]):
            return "task"
        if any(w in t for w in ["голос", "voice", "произнес"]):
            return "voice"
        if any(w in t for w in ["знани", "документ", "политик", "knowledge", "policy"]):
            return "knowledge"
        return "general"

    @staticmethod
    def _mock_general(text: str) -> str:
        if not text:
            return "Готов помочь. Опишите задачу."
        # Echo-ish but plausible
        snippet = text.strip()[:160]
        return (
            f"Принято: «{snippet}». В рабочем режиме здесь будет ответ DeepSeek с "
            f"учётом корпоративной памяти и confidence scoring. Сейчас система "
            f"работает в demo-режиме (API ключ ещё не подключён)."
        )


# Singleton
_client: Optional[DeepSeekClient] = None


def get_deepseek() -> DeepSeekClient:
    global _client
    if _client is None:
        _client = DeepSeekClient()
    return _client
