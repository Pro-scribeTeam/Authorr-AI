import runpod
import soundfile as sf
import base64
import io
import os
import re
import tempfile
import traceback

import numpy as np

print("Starting Chatterbox TTS handler (server-side chunking)...", flush=True)

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

# ── Chunking config ──────────────────────────────────────────────────────────
# Chatterbox clips audio when text exceeds its internal token budget.
# Keeping chunks at ~200 chars ensures every word is fully rendered.
MAX_CHUNK_CHARS = 200
SAMPLE_RATE = 22050
SILENCE_MS = 250  # silence gap between chunks in the combined output

# ── Load model ───────────────────────────────────────────────────────────────
classic_model = None
try:
    from chatterbox.tts import ChatterboxTTS
    print("Loading Chatterbox model...", flush=True)
    classic_model = ChatterboxTTS.from_pretrained(device="cuda")
    print("Chatterbox model loaded.", flush=True)
except Exception as e:
    print(f"ERROR loading model: {e}", flush=True)
    traceback.print_exc()


# ── Text splitting ────────────────────────────────────────────────────────────
def split_text(text: str, max_chars: int = MAX_CHUNK_CHARS) -> list:
    """Split at sentence > clause > word boundaries. Never cuts mid-word."""
    normalized = re.sub(r'\s+', ' ', text).strip()
    raw_sentences = re.split(r'(?<=[.!?])\s+', normalized)
    sentences = [s.strip() for s in raw_sentences if s.strip()]

    chunks = []
    current = ""

    for sentence in sentences:
        sep = " " if current else ""
        if len(current) + len(sep) + len(sentence) <= max_chars:
            current += sep + sentence
            continue

        if current:
            chunks.append(current.strip())
            current = ""

        if len(sentence) <= max_chars:
            current = sentence
            continue

        # Sentence too long — try clause boundaries
        clauses = re.split(r'(?<=[,;:\-\u2014])\s+', sentence)
        for clause in clauses:
            sep = " " if current else ""
            if len(current) + len(sep) + len(clause) <= max_chars:
                current += sep + clause
                continue
            if current:
                chunks.append(current.strip())
                current = ""
            if len(clause) <= max_chars:
                current = clause
                continue
            # Last resort: word split
            for word in clause.split():
                sep = " " if current else ""
                if len(current) + len(sep) + len(word) <= max_chars:
                    current += sep + word
                else:
                    if current:
                        chunks.append(current.strip())
                    current = word

    if current.strip():
        chunks.append(current.strip())

    # Ensure every chunk ends with punctuation so model treats it as complete
    result = []
    for c in chunks:
        t = c.strip()
        result.append(t if re.search(r'[.!?,;:]$', t) else t + '.')
    return result


# ── Audio helpers ─────────────────────────────────────────────────────────────
def wav_tensor_to_numpy(wav):
    """Convert torch tensor (1, N) or (N,) to float32 numpy array."""
    import torch
    if isinstance(wav, torch.Tensor):
        return wav.squeeze().cpu().float().numpy()
    return np.array(wav, dtype=np.float32).squeeze()


def concatenate_audio(arrays: list, silence_ms: int = SILENCE_MS) -> np.ndarray:
    silence_samples = int(SAMPLE_RATE * silence_ms / 1000)
    silence = np.zeros(silence_samples, dtype=np.float32)
    parts = []
    for i, arr in enumerate(arrays):
        parts.append(arr.astype(np.float32))
        if i < len(arrays) - 1:
            parts.append(silence)
    return np.concatenate(parts)


def numpy_to_b64_wav(audio: np.ndarray, fmt: str = "wav") -> str:
    buf = io.BytesIO()
    sf.write(buf, audio, SAMPLE_RATE, format=fmt.upper(), subtype="PCM_16")
    buf.seek(0)
    return base64.b64encode(buf.read()).decode()


def decode_audio_prompt(audio_b64: str) -> str:
    """Write base64 audio to a temp file and return the path."""
    audio_bytes = base64.b64decode(audio_b64)
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.write(audio_bytes)
    tmp.close()
    return tmp.name


# ── Main handler ─────────────────────────────────────────────────────────────
def handler(job):
    job_input = job.get("input", {})

    text = (job_input.get("text") or job_input.get("prompt") or "").strip()
    if not text:
        return {"error": "Missing required field: text (or prompt)"}

    if classic_model is None:
        return {"error": "Chatterbox model failed to load on startup"}

    fmt = job_input.get("format", "wav").lower()
    if fmt not in ("wav", "flac", "ogg"):
        fmt = "wav"

    exaggeration = float(job_input.get("exaggeration", 0.5))
    cfg_weight   = float(job_input.get("cfg_weight", 0.5))
    temperature  = float(job_input.get("temperature", 0.8))
    seed         = job_input.get("seed", None)

    # ── Resolve audio prompt (voice reference) ───────────────────────────────
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

    # ── Split text into safe chunks ───────────────────────────────────────────
    chunks = split_text(text)
    print(
        f"[handler] {len(text)} chars → {len(chunks)} chunks "
        f"(max {MAX_CHUNK_CHARS} chars each) | "
        f"exag={exaggeration} cfg={cfg_weight} temp={temperature} seed={seed}",
        flush=True,
    )

    audio_arrays = []
    try:
        for i, chunk in enumerate(chunks):
            print(f"[handler] Chunk {i+1}/{len(chunks)}: {len(chunk)} chars", flush=True)

            generate_kwargs = dict(
                text=chunk,
                exaggeration=exaggeration,
                cfg_weight=cfg_weight,
                temperature=temperature,
            )
            if seed is not None:
                generate_kwargs["seed"] = int(seed)
            if audio_prompt_path:
                generate_kwargs["audio_prompt_path"] = audio_prompt_path

            wav = classic_model.generate(**generate_kwargs)
            arr = wav_tensor_to_numpy(wav)
            audio_arrays.append(arr)
            print(f"[handler] Chunk {i+1} done — {len(arr)} samples", flush=True)

    except Exception as e:
        traceback.print_exc()
        # If we have at least some audio, return what we have; otherwise error
        if not audio_arrays:
            return {"error": str(e)}
        print(f"[handler] Partial failure at chunk — returning {len(audio_arrays)} chunks", flush=True)

    finally:
        if cleanup_path and os.path.exists(cleanup_path):
            os.remove(cleanup_path)

    # ── Concatenate all chunks into one WAV ───────────────────────────────────
    combined = concatenate_audio(audio_arrays)
    audio_b64 = numpy_to_b64_wav(combined, fmt)

    print(
        f"[handler] Done — {len(combined)} samples combined from {len(audio_arrays)} chunks",
        flush=True,
    )
    return {
        "audio":           audio_b64,
        "format":          fmt,
        "mode":            job_input.get("mode", "classic"),
        "chunks_rendered": len(audio_arrays),
        "total_chunks":    len(chunks),
    }


runpod.serverless.start({"handler": handler})
