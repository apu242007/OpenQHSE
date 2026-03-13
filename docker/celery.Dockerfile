# ── Celery Worker ────────────────────────────────────────────
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY apps/api/pyproject.toml ./
RUN pip install --upgrade pip && \
    pip install .

COPY apps/api/ ./

CMD ["celery", "-A", "app.celery_app:celery", "worker", "--loglevel=info", "--concurrency=4", "-Q", "notifications,reports,ai"]
