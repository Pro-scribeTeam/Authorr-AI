from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import soundfile as sf
import base64
import io

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from chatterbox.tts import ChatterboxTTS
model = ChatterboxTTS.from_pretrained(device="cuda")

class TTSRequest(BaseModel):
    text: str
    exaggeration: float = 0.5
    cfg_weight: float = 0.5

@app.post("/tts")
async def generate_speech(req: TTSRequest):
    wav = model.generate(req.text, exaggeration=req.exaggeration, cfg_weight=req.cfg_weight)
    buf = io.BytesIO()
    sf.write(buf, wav.squeeze().numpy(), 22050, format="WAV")
    buf.seek(0)
    audio_b64 = base64.b64encode(buf.read()).decode()
    return {"audio": audio_b64, "format": "wav"}

@app.get("/health")
async def health():
    return {"status": "ok"}
