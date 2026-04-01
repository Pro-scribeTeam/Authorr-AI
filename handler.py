import runpod
from chatterbox.tts import ChatterboxTTS
import soundfile as sf
import base64
import io

print("Loading Chatterbox model...")
model = ChatterboxTTS.from_pretrained(device="cuda")
print("Model loaded.")

def handler(job):
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

runpod.serverless.start({"handler": handler})
