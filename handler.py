import runpod
from chatterbox.tts import ChatterboxTTS
import soundfile as sf
import base64
import io
import os
import tempfile
import traceback

print("Starting Chatterbox TTS handler...", flush=True)

try:
    from chatterbox.tts import ChatterboxTTS
    print("Chatterbox imported successfully.", flush=True)
    model = ChatterboxTTS.from_pretrained(device="cuda")
    print("Chatterbox model loaded.", flush=True)
except Exception as e:
    print(f"ERROR loading model: {e}", flush=True)
    traceback.print_exc()
    model = None

def handler(job):
    if model is None:
        return {"error": "Model failed to load on startup"}

    try:
        job_input = job["input"]

        text = job_input.get("text", "")
        if not text:
            return {"error": "Missing required field: text"}

        exaggeration = float(job_input.get("exaggeration", 0.5))
        cfg_weight = float(job_input.get("cfg_weight", 0.5))

        # Optional: base64-encoded reference audio for voice cloning
        audio_prompt_b64 = job_input.get("audio_prompt", None)
        audio_prompt_path = None

        if audio_prompt_b64:
            print("Voice cloning mode: decoding reference audio...", flush=True)
            audio_bytes = base64.b64decode(audio_prompt_b64)
            tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            tmp.write(audio_bytes)
            tmp.close()
            audio_prompt_path = tmp.name

        print(f"Generating audio: {len(text)} chars, exaggeration={exaggeration}, cfg_weight={cfg_weight}", flush=True)

        if audio_prompt_path:
            wav = model.generate(
                text,
                audio_prompt_path=audio_prompt_path,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight
            )
        else:
            wav = model.generate(
                text,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight
            )

        buf = io.BytesIO()
        sf.write(buf, wav.squeeze().numpy(), 22050, format="WAV")
        buf.seek(0)
        audio_b64 = base64.b64encode(buf.read()).decode()

        # Clean up temp file if used
        if audio_prompt_path and os.path.exists(audio_prompt_path):
            os.remove(audio_prompt_path)

        print("Audio generation complete.", flush=True)
        return {"audio": audio_b64, "format": "wav"}

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

runpod.serverless.start({"handler": handler})
