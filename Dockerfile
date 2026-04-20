# Use a pre-built Chatterbox TTS image that already has PyTorch, CUDA,
# chatterbox-tts, and the model weights baked in.
# This avoids GitHub Actions disk space limits (~14GB free) that were
# causing the build to fail when installing everything from scratch.
FROM liamvisionary/chatterbox-tts-runpod:v2

WORKDIR /app

# Install RunPod serverless SDK and audio deps on top of the base image
RUN pip install --no-cache-dir \
    runpod \
    soundfile \
    numpy

# Copy our handler
COPY handler.py .

CMD ["python", "-u", "handler.py"]
