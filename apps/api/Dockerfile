# Use an official Python runtime
FROM python:3.13.1-slim

# Install uv (package manager)
RUN pip install --no-cache-dir uv

# App workdir
WORKDIR /app

# Copy only dep manifests first for better layer caching
COPY pyproject.toml uv.lock ./

# Install deps into a managed .venv (from the exact lock)
RUN uv sync --frozen --no-cache

# Copy only the source code (all we need for the API)
COPY src/ ./src/

# Default port for Cloud Run (can be overridden via env)
ENV PORT=8080
EXPOSE 8080

# Run via uv (uses the .venv automatically)
CMD ["sh", "-c", "uv run uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
