FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

WORKDIR /app

RUN pip install --no-cache-dir \
    runpod \
    soundfile \
    chatterbox-tts

COPY handler.py .

CMD ["python", "-u", "handler.py"]
