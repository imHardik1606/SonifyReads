import pdfplumber
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io
import re
import edge_tts
import asyncio
import uuid
from dotenv import load_dotenv
import os

app = FastAPI()

load_dotenv()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "Backend running 🚀"}

def clean_page_text(text: str) -> str:
    """Remove headers, footers, page numbers, junk lines"""
    if not text:
        return ""

    lines = text.splitlines()
    cleaned_lines = []

    for line in lines:
        line = line.strip()

        if not line:
            continue

        # Remove page numbers
        if re.fullmatch(r"(page\s*)?\d+", line.lower()):
            continue

        # Remove copyright / URLs / boilerplate
        if re.search(r"(copyright|all rights reserved|www\.|http)", line.lower()):
            continue

        cleaned_lines.append(line)

    return " ".join(cleaned_lines)


def is_front_matter(text: str) -> bool:
    """Detect TOC, copyright, title pages"""
    front_keywords = [
        "table of contents",
        "copyright",
        "first published",
        "published by",
        "publishing group",
        "translated by",
        "cover design",
        "library of congress",
        "cataloging-in-publication",
        "isbn",
        "imprint",
        "all rights reserved",
    ]

    lowered = text.lower()
    return any(keyword in lowered for keyword in front_keywords)


async def text_to_speech(text: str, voice="en-US-AriaNeural"):
    filename = f"audio_{uuid.uuid4()}.mp3"

    # Convert paragraph breaks into pauses
    ssml_text = text.replace("\n\n", '<break time="800ms"/>')

    communicate = edge_tts.Communicate(
        text=ssml_text,
        voice=voice
    )

    async for chunk in communicate.stream():
        if chunk['type'] == "audio":
            yield chunk["data"]

@app.post("/extract-text/")
async def extract_text(file: UploadFile = File(...)):
    content = await file.read()

    final_text = []
    content_started = False

    with pdfplumber.open(io.BytesIO(content)) as pdf:
        is_small_pdf = len(pdf.pages) <= 2
        for page in pdf.pages:
            raw_text = page.extract_text()
            if not raw_text:
                continue

            cleaned = clean_page_text(raw_text)

            # If small PDF, include all text
            if is_small_pdf:
                final_text.append(cleaned)
                continue

            # Skip front matter until actual content starts
            if not content_started:
                if is_front_matter(cleaned):
                    continue

                if re.search(r"(chapter\s+\d+|foreword|introduction)", cleaned.lower()):
                    content_started = True

            if content_started:
                final_text.append(cleaned)

    
    text = "\n\n".join(final_text)

    headers = {
        "Content-Disposition" : f'attachment; filename="{file.filename.rsplit(".",1)[0]}.mp3"'
    }

    return StreamingResponse(
        text_to_speech(text),
        media_type="audio/mpeg",
        headers=headers
    )