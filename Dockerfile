# Official PyTorch runtime image with CUDA 12.1
FROM pytorch/pytorch:2.3.0-cuda12.1-cudnn8-runtime

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libsndfile1 \
    ffmpeg \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Install Python deps
RUN pip install --no-cache-dir runpod
RUN pip install --no-cache-dir soundfile
RUN pip install --no-cache-dir numpy
RUN pip install --no-cache-dir "chatterbox-tts>=0.1.7"

# Pre-download both models at build time so cold starts are near-instant
# Classic model (ChatterboxTTS)
RUN python -c "\
from chatterbox.tts import ChatterboxTTS; \
print('Downloading Chatterbox Classic...'); \
ChatterboxTTS.from_pretrained(device='cpu'); \
print('Classic model cached.')"

# Turbo model (ChatterboxTurboTTS)
RUN python -c "\
from chatterbox.tts_turbo import ChatterboxTurboTTS; \
print('Downloading Chatterbox Turbo...'); \
ChatterboxTurboTTS.from_pretrained(device='cpu'); \
print('Turbo model cached.')"

COPY handler.py .

CMD ["python", "-u", "handler.py"]
