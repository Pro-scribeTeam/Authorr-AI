# Official PyTorch runtime image with CUDA 12.1
FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install deps one at a time so we can see which one fails
RUN pip install --no-cache-dir runpod
RUN pip install --no-cache-dir soundfile
RUN pip install --no-cache-dir numpy
RUN pip install --no-cache-dir chatterbox-tts

COPY handler.py .

CMD ["python", "-u", "handler.py"]
