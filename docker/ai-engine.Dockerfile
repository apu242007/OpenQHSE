# ── AI Engine Service ────────────────────────────────────────
FROM python:3.11-slim AS ai-base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY apps/ai-engine/pyproject.toml ./
RUN pip install --upgrade pip && \
    pip install .

COPY apps/ai-engine/ ./

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
