import runpod
import soundfile as sf
import base64
import io
import os
import tempfile
import traceback

print("Starting Chatterbox TTS handler (Classic only)...", flush=True)

# ── Voice map: name → MP3 filename in repo root ─────────────────────────────
VOICE_MAP = {
    "adam":         "Adam.mp3",
    "alexandra":    "Alexandra.mp3",
    "annie":        "Annie.mp3",
    "benjamin":     "Benjamin.mp3",
    "betty":        "Betty.mp3",
    "bob":          "Bob.mp3",
    "brandy ny":    "Brandy NY.mp3",
    "clark":        "Clark.mp3",
    "damon":        "Damon.mp3",
    "darren":       "Darren.mp3",
    "diana":        "Diana.mp3",
    "dwight":       "Dwight.mp3",
    "edward":       "Edward.mp3",
    "erica":        "Erica.mp3",
    "explainer":    "Explainer.mp3",
    "glen":         "Glen.mp3",
    "helen":        "Helen.mp3",
    "helen-2":      "Helen-2.mp3",
    "jeffrey":      "Jeffrey.mp3",
    "jenny":        "Jenny.mp3",
    "john forcast": "John Forcast.mp3",
    "kim":          "Kim.mp3",
    "lerry":        "Lerry.mp3",
    "lizz":         "Lizz.mp3",
    "marie":        "Marie.mp3",
    "maxwell":      "Maxwell.mp3",
    "melissa":      "Melissa.mp3",
    "mia":          "Mia.mp3",
    "mike":         "Mike.mp3",
    "paul":         "Paul.mp3",
    "sean":         "Sean.mp3",
    "shaundria":    "Shaundria.mp3",
    "tawnya":       "Tawnya.mp3",
}

# ── Load Classic model ──────────────────────────────────────────────────────
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
    seed         = job_input.get("seed", None)

    # ── Resolve audio prompt ─────────────────────────────────────────────────
    # Priority: 1) uploaded audio_prompt (base64), 2) named voice from VOICE_MAP
    audio_prompt_path = None
    cleanup_path      = None

    audio_prompt_b64 = job_input.get("audio_prompt", None)
    if audio_prompt_b64:
        print("Voice-clone mode: decoding uploaded reference audio...", flush=True)
        audio_prompt_path = decode_audio_prompt(audio_prompt_b64)
        cleanup_path = audio_prompt_path
    else:
        voice_name = (job_input.get("voice") or "").strip().lower()
        if voice_name and voice_name in VOICE_MAP:
            mp3_file = VOICE_MAP[voice_name]
            candidate = os.path.join(os.path.dirname(__file__), mp3_file)
            if os.path.exists(candidate):
                audio_prompt_path = candidate
                print(f"Using voice: {voice_name} → {mp3_file}", flush=True)
            else:
                print(f"WARNING: Voice file not found: {candidate}", flush=True)
        else:
            print(f"No voice matched for: '{voice_name}' — using default", flush=True)

    print(
        f"[Classic] Generating: {len(text)} chars | "
        f"exag={exaggeration} | cfg={cfg_weight} | "
        f"temp={temperature} | seed={seed}",
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
        if cleanup_path and os.path.exists(cleanup_path):
            os.remove(cleanup_path)


runpod.serverless.start({"handler": handler})
