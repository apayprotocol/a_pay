# Multi-stage production build for A-Pay Gateway
FROM python:3.13-slim AS builder

WORKDIR /app

# Install compilation prerequisites
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install uv for high-speed deterministic dependency installation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy package manifests and source
COPY pyproject.toml README.md ./
COPY src/ ./src/

# Create virtual environment and install package with redis support
RUN uv venv /opt/venv && \
    . /opt/venv/bin/activate && \
    uv pip install --no-cache .[redis]

# Runtime stage: slim and minimal attack surface
FROM python:3.13-slim AS runner

WORKDIR /app

# Non-root system user for security
RUN groupadd -r apay && useradd -r -g apay -d /app apay

# Copy virtualenv and application code
COPY --from=builder /opt/venv /opt/venv
COPY pyproject.toml README.md ./
COPY src/ ./src/

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV HOST=0.0.0.0
ENV NETWORK=base
ENV CURRENCY=USDC

USER apay

EXPOSE 8080

ENTRYPOINT ["apay", "protect"]
