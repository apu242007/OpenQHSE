"""Centralised slowapi rate limiter singleton.

Import this module in routers to apply per-endpoint limits:

    from app.core.rate_limit import limiter

    @router.post("/login")
    @limiter.limit("10/minute")
    async def login(request: Request, ...):
        ...

The limiter is registered on the FastAPI app in main.py:
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
"""

"""Centralised slowapi rate limiter singleton.

Import this module in routers to apply per-endpoint limits:

    from app.core.rate_limit import limiter

    @router.post("/login")
    @limiter.limit("10/minute")
    async def login(request: Request, ...):
        ...

The limiter is registered on the FastAPI app in main.py:
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

KEY STRATEGY:
- Authenticated endpoints: keyed by organization_id (from JWT) to prevent
  one noisy tenant from rate-limiting others behind the same proxy IP.
- Public / unauthenticated endpoints: keyed by X-Forwarded-For or remote addr.
"""

from slowapi import Limiter  # noqa: E402
from slowapi.util import get_remote_address  # noqa: E402


def _get_rate_limit_key(request) -> str:  # type: ignore[no-untyped-def]
    """Key function: org_id for authenticated requests, IP for public ones.

    Reads org_id from the current_org_id ContextVar set by get_current_user().
    """
    try:
        from app.core.context import current_org_id

        org_id = current_org_id.get(None)
        if org_id:
            return f"org:{org_id}"
    except Exception:
        pass
    # Fall back to real IP, respecting reverse proxy headers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return get_remote_address(request)


limiter = Limiter(
    key_func=_get_rate_limit_key,
    default_limits=["1000/hour"],
)
