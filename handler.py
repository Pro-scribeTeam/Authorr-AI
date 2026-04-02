import runpod
import soundfile as sf
import base64
import io
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
        text = job_input["text"]
        exaggeration = job_input.get("exaggeration", 0.5)
        cfg_weight = job_input.get("cfg_weight", 0.5)

        wav = model.generate(text, exaggeration=exaggeration, cfg_weight=cfg_weight)
        buf = io.BytesIO()
        sf.write(buf, wav.squeeze().numpy(), 22050, format="WAV")
        buf.seek(0)
        audio_b64 = base64.b64encode(buf.read()).decode()
        return {"audio": audio_b64, "format": "wav"}
    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}

runpod.serverless.start({"handler": handler})
