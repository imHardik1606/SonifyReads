import re
import os
import fitz
import edge_tts
import asyncio

from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

# ------------------ setup ------------------

app = FastAPI()
load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)

VOICE = "en-US-GuyNeural"
MAX_CHARS = 3500
TTS_CONCURRENCY = 6

OUTPUT_DIR = "output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

tts_semaphore = asyncio.Semaphore(TTS_CONCURRENCY)

# ------------------ helpers ------------------

def clean_page_text(text: str) -> str:
    lines = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        if re.fullmatch(r"(page\s*)?\d+", line.lower()):
            continue
        if re.search(r"(copyright|all rights reserved|www\.|http)", line.lower()):
            continue
        lines.append(line)
    return " ".join(lines)

def is_front_matter(text: str) -> bool:
    keywords = [
        # publishing / legal
        "copyright",
        "all rights reserved",
        "isbn",
        "library of congress",
        "cataloging-in-publication",
        "cip data",
        "published by",
        "first published",
        "imprint",
        "printed in",
        "edition",
        "typeset",
        "design by",
        "cover design",

        # navigation
        "table of contents",
        "contents",
        "list of figures",
        "list of tables",
        "list of illustrations",
        "index",

        # filler
        "dedication",
        "this book is dedicated",
        "acknowledgements",
        "acknowledgments",
    ]

    text = text.lower()
    return any(k in text for k in keywords)

def chunk_text(text: str, max_chars: int = MAX_CHARS):
    chunks = []
    buffer = ""

    for sentence in text.split(". "):
        if len(buffer) + len(sentence) > max_chars:
            chunks.append(buffer.strip())
            buffer = sentence
        else:
            buffer += sentence + ". "

    if buffer:
        chunks.append(buffer.strip())

    return chunks

# ------------------ TTS ------------------

async def tts_chunk(text: str) -> bytes:
    async with tts_semaphore:
        communicate = edge_tts.Communicate(text=text, voice=VOICE)
        audio = bytearray()

        async for msg in communicate.stream():
            if msg["type"] == "audio":
                audio.extend(msg["data"])

        return bytes(audio)

# ------------------ endpoint ------------------

@app.get("/")
def health_check():
    return{
        "status": "Backend is running."
    }

@app.post("/extract-text/")
async def extract_text(file: UploadFile = File(...)):
    pdf_bytes = await file.read()

    output_path = os.path.join(
        OUTPUT_DIR,
        f"{os.path.splitext(file.filename)[0]}.mp3"
    )

    async def audio_generator():
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")

        content_started = False
        is_small_pdf = len(doc) <= 2

        with open(output_path, "wb") as final_audio:

            for i, page in enumerate(doc):
                raw_text = page.get_text("text")
                if not raw_text:
                    continue

                cleaned = clean_page_text(raw_text)
                if not cleaned:
                    continue

                if not is_small_pdf:
                    if not content_started:
                        if i < 10 and is_front_matter(cleaned):
                            continue
                        if re.search(r"(chapter\s+\d+|introduction|foreword)", cleaned.lower()):
                            content_started = True
                        else:
                            continue

                chunks = chunk_text(cleaned)

                # 🚀 generate chunks concurrently
                tasks = [tts_chunk(chunk) for chunk in chunks]
                results = await asyncio.gather(*tasks)

                # ✅ yield in correct order
                for audio_bytes in results:
                    final_audio.write(audio_bytes)
                    final_audio.flush()
                    yield audio_bytes

    return StreamingResponse(
        audio_generator(),
        media_type="audio/mpeg",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )
