"""Ollama LLM client wrapper — LangChain 0.3.x LCEL + Ollama Python 0.4.x.

Architecture
------------
* ``OllamaClient``   — thin async wrapper kept for backward compatibility with
                       the legacy ``AnalysisService``.  Uses ``httpx`` directly
                       for /api/generate and /api/chat.
* ``LangChainLLM``   — new LCEL-based helper that composes
                       ``langchain_ollama.ChatOllama | StrOutputParser`` chains.
                       Used by the new KPI-trend endpoint and any future tasks
                       that benefit from streaming or message-history support.
* ``get_ollama_async_client()`` — returns a raw ``ollama.AsyncClient`` (0.4.x)
                       for callers that need attribute-access response objects
                       (``response.message.content`` instead of
                       ``response['message']['content']``).
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

import httpx
import structlog
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from ollama import AsyncClient as OllamaAsyncClient
from redis.asyncio import Redis

from app.core.config import get_settings

logger = structlog.get_logger(__name__)

_redis: Redis | None = None


# ── Redis helpers ──────────────────────────────────────────────────────────────

async def get_redis() -> Redis:
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = Redis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


# ── Ollama 0.4.x async client factory ─────────────────────────────────────────

def get_ollama_async_client() -> OllamaAsyncClient:
    """Return a raw ``ollama.AsyncClient`` (0.4.x).

    Response objects use attribute access::

        response = await client.chat(model="llama3.2", messages=[...])
        text = response.message.content          # ← 0.4.x style
    """
    settings = get_settings()
    return OllamaAsyncClient(host=settings.ollama_base_url)


# ── LangChain 0.3.x LCEL helper ───────────────────────────────────────────────

class LangChainLLM:
    """LCEL-based chain builder using ``langchain_ollama.ChatOllama``.

    Usage::

        lc = LangChainLLM()
        result = await lc.ainvoke(
            system="You are a QHSE expert.",
            human_template="Analyze: {data}",
            variables={"data": "..."},
        )
    """

    def __init__(self) -> None:
        settings = get_settings()
        self._settings = settings
        self._llm = ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            temperature=settings.ollama_temperature,
            num_predict=settings.ollama_max_tokens,
        )
        self._parser = StrOutputParser()

    def _build_chain(self, system: str, human_template: str):  # type: ignore[no-untyped-def]
        """Return a compiled LCEL chain: prompt | llm | parser."""
        prompt = ChatPromptTemplate.from_messages(
            [
                ("system", system),
                ("human", human_template),
            ]
        )
        return prompt | self._llm | self._parser

    async def ainvoke(
        self,
        *,
        system: str,
        human_template: str,
        variables: dict[str, Any],
        use_cache: bool = True,
    ) -> str:
        """Invoke the chain asynchronously, with optional Redis caching."""
        if use_cache:
            cache_key = _cache_key("lc", system, human_template, json.dumps(variables, sort_keys=True))
            cached = await _get_cached(cache_key)
            if cached is not None:
                logger.debug("langchain_cache_hit", key=cache_key[:16])
                return cached

        chain = self._build_chain(system, human_template)
        result: str = await chain.ainvoke(variables)

        if use_cache:
            await _set_cached(cache_key, result, self._settings.cache_ttl)

        return result


def get_langchain_llm() -> LangChainLLM:
    return LangChainLLM()


# ── Legacy OllamaClient (backward-compatible) ──────────────────────────────────

class OllamaClient:
    """Thin async wrapper around the Ollama REST API.

    Kept for backward compatibility with ``AnalysisService`` and any route
    that was written before LangChain 0.3 migration.  New code should prefer
    ``LangChainLLM`` (LCEL) or ``get_ollama_async_client()`` (raw 0.4.x).
    """

    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.ollama_base_url
        self.model = settings.ollama_model
        self.embedding_model = settings.ollama_embedding_model
        self.timeout = settings.ollama_timeout
        self.temperature = settings.ollama_temperature
        self.max_tokens = settings.ollama_max_tokens
        self.cache_ttl = settings.cache_ttl

    # ── Generation ──────────────────────────────────────────

    async def generate(
        self,
        prompt: str,
        *,
        system: str | None = None,
        temperature: float | None = None,
        max_tokens: int | None = None,
        use_cache: bool = True,
    ) -> str:
        ck = _cache_key("gen", prompt, system or "")
        if use_cache:
            cached = await _get_cached(ck)
            if cached is not None:
                logger.debug("ollama_cache_hit", key=ck[:16])
                return cached

        payload: dict[str, Any] = {
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": temperature or self.temperature,
                "num_predict": max_tokens or self.max_tokens,
            },
        }
        if system:
            payload["system"] = system

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/api/generate", json=payload)
            response.raise_for_status()

        result = response.json()["response"]
        if use_cache:
            await _set_cached(ck, result, self.cache_ttl)
        return result

    # ── Chat ────────────────────────────────────────────────

    async def chat(
        self,
        messages: list[dict[str, str]],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        payload: dict[str, Any] = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature or self.temperature,
                "num_predict": max_tokens or self.max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=payload)
            response.raise_for_status()

        # Ollama REST API still returns a dict; attribute-access is only for
        # the ollama-python 0.4.x SDK client (OllamaAsyncClient).
        return response.json()["message"]["content"]

    # ── Embeddings ──────────────────────────────────────────

    async def embed(self, text: str) -> list[float]:
        ck = _cache_key("emb", text)
        cached = await _get_cached(ck)
        if cached is not None:
            return json.loads(cached)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.embedding_model, "prompt": text},
            )
            response.raise_for_status()

        embedding = response.json()["embedding"]
        await _set_cached(ck, json.dumps(embedding), self.cache_ttl)
        return embedding

    # ── Health ──────────────────────────────────────────────

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False


def get_ollama_client() -> OllamaClient:
    return OllamaClient()


# ── Module-level cache helpers ─────────────────────────────────────────────────

def _cache_key(prefix: str, *parts: str) -> str:
    raw = "|".join(parts)
    digest = hashlib.sha256(raw.encode()).hexdigest()[:24]
    return f"ai:{prefix}:{digest}"


async def _get_cached(key: str) -> str | None:
    try:
        redis = await get_redis()
        return await redis.get(key)
    except Exception:
        return None


async def _set_cached(key: str, value: str, ttl: int) -> None:
    try:
        redis = await get_redis()
        await redis.setex(key, ttl, value)
    except Exception:
        logger.warning("redis_cache_set_failed", key=key)
