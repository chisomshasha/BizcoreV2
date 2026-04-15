FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (ffmpeg for any video features if needed, though not visible in this tree)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first (better layer caching)
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/server.py ./server.py
COPY backend/server_auth_patch.py ./server_auth_patch.py

# Create directories for any file uploads (if your app uses them)
RUN mkdir -p uploads

# Fly.io convention: listen on port 8080 internally
EXPOSE 8080

# Production-ready command
# Uses ${PORT:-8080} so it respects Fly.io's $PORT while having a safe default
CMD uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080} \
    --timeout-keep-alive 300 \
    --limit-max-requests 1000
