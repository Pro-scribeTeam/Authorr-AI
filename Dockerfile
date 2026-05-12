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
RUN pip install --no-cache-dir chatterbox-tts
RUN pip install --no-cache-dir "transformers==4.44.2"

COPY handler.py .

CMD ["python", "-u", "handler.py"]
