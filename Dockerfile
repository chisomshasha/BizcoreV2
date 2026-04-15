FROM python:3.11-slim

WORKDIR /app

# Install ffmpeg so video transcoding works
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/server.py ./server.py
COPY backend/services.py ./services.py
COPY backend/video_transcoder.py ./video_transcoder.py

RUN mkdir -p uploads/photos uploads/videos

EXPOSE 8080

# Use shell form so $PORT expands correctly from Railway's environment
CMD uvicorn server:app --host 0.0.0.0 --port $PORT --timeout-keep-alive 300 --limit-max-requests 1000
