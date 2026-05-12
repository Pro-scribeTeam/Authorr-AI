import runpod
import soundfile as sf
import base64
import io
import os
import tempfile
import traceback

print("Starting Chatterbox TTS handler (Classic only)...", flush=True)

classic_model = None
try:
    from chatterbox.tts import ChatterboxTTS
    print("Loading Chatterbox Classic...", flush=True)
    classic_model = ChatterboxTTS.from_pretrained(device="cuda")
    print("Chatterbox Classic loaded.", flush=True)
except Exception as e:
    print(f"ERROR loading Classic model: {e}", flush=True)
    traceback.print_exc()


def audio_to_b64(wav_tensor, sample_rate=22050, fmt="wav"):
    buf = io.BytesIO()
    sf.write(buf, wav_tensor.squeeze().numpy(), sample_rate, format=fmt.upper())
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


def decode_audio_prompt(audio_b64):
    audio_bytes = base64.b64decode(audio_b64)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.write(audio_bytes)
    tmp.close()
    return tmp.name


def handler(job):
    job_input = job.get("input", {})

    text = job_input.get("text") or job_input.get("prompt", "")
    if not text:
        return {"error": "Missing required field: text (or prompt)"}

    if classic_model is None:
        return {"error": "Chatterbox Classic model failed to load on startup"}

    fmt = job_input.get("format", "wav").lower()
    if fmt not in ("wav", "flac", "ogg"):
        fmt = "wav"

    exaggeration = float(job_input.get("exaggeration", 0.5))
    cfg_weight   = float(job_input.get("cfg_weight", 0.5))
    temperature  = float(job_input.get("temperature", 0.8))
    speed_factor = float(job_input.get("speed_factor", 1.0))
    seed         = job_input.get("seed", None)

    audio_prompt_b64  = job_input.get("audio_prompt", None)
    audio_prompt_path = None
    if audio_prompt_b64:
        print("Voice-clone mode: decoding reference audio...", flush=True)
        audio_prompt_path = decode_audio_prompt(audio_prompt_b64)

    print(
        f"[Classic] Generating: {len(text)} chars | "
        f"exag={exaggeration} | cfg={cfg_weight} | "
        f"temp={temperature} | speed={speed_factor} | seed={seed}",
        flush=True
    )

    try:
        generate_kwargs = dict(
            text=text,
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
            temperature=temperature,
            
        )
        if seed is not None:
            generate_kwargs["seed"] = int(seed)
        if audio_prompt_path:
            generate_kwargs["audio_prompt_path"] = audio_prompt_path

        wav = classic_model.generate(**generate_kwargs)
        audio_b64 = audio_to_b64(wav, sample_rate=22050, fmt=fmt)
        print("[Classic] Generation complete.", flush=True)
        return {"audio": audio_b64, "format": fmt, "mode": "classic"}

    except Exception as e:
        traceback.print_exc()
        return {"error": str(e)}
    finally:
        if audio_prompt_path and os.path.exists(audio_prompt_path):
            os.remove(audio_prompt_path)


runpod.serverless.start({"handler": handler})
