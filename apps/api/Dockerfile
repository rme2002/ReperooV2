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

# Now copy the rest of your app
COPY . .

# Expose the actual port you're using
EXPOSE 8080

# Run via uv (uses the .venv automatically)
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
