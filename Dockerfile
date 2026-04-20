FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

WORKDIR /app

# Install dependencies
RUN pip install --no-cache-dir \
    runpod \
    soundfile \
    numpy \
    chatterbox-tts

# Pre-download the Chatterbox model at build time so it's baked into the image.
# This prevents cold-start timeouts on RunPod serverless where jobs would otherwise
# sit IN_QUEUE while the model downloads from HuggingFace at runtime.
RUN python3 -c "\
from chatterbox.tts import ChatterboxTTS; \
print('Downloading Chatterbox model...'); \
ChatterboxTTS.from_pretrained(device='cpu'); \
print('Model downloaded and cached successfully.')"

COPY handler.py .

CMD ["python", "-u", "handler.py"]
