FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (ffmpeg for any media handling)
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application files
COPY backend/server.py ./server.py
COPY backend/permissions.py ./permissions.py

EXPOSE 8080

CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8080} --timeout-keep-alive 300"]
