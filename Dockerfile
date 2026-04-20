# Use official PyTorch image with CUDA — smaller and more reliable than runpod/pytorch
# for GitHub Actions builds. RunPod supports any CUDA-enabled image.
FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
RUN pip install --no-cache-dir \
    runpod \
    soundfile \
    numpy \
    chatterbox-tts

# Copy our handler
COPY handler.py .

CMD ["python", "-u", "handler.py"]
