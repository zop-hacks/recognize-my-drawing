# Simple, production-ready base that already includes uv + Python
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

# 1) Leverage layer caching: copy only metadata first
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# 2) Copy your code
COPY app ./app

# Fly routes to port 8080 internally
EXPOSE 8080

# Run the server from uv's environment
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
