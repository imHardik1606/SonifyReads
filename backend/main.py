import re
import os
import fitz
import edge_tts
import asyncio
import tempfile
import shutil
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
import httpx

# ------------------ setup ------------------

load_dotenv()

app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------ email config ------------------

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "onboarding@resend.dev")
RESEND_API_URL = "https://api.resend.com/emails"

# ------------------ TTS config (Render-safe) ------------------

VOICE = "en-US-GuyNeural"
MAX_CHARS = 3500

# IMPORTANT: reduced concurrency for Render
TTS_CONCURRENCY = 2
tts_semaphore = asyncio.Semaphore(TTS_CONCURRENCY)

# ------------------ models ------------------

class EmailResponse(BaseModel):
    message: str
    email: str
    filename: str
    status: str

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
        "copyright", "all rights reserved", "isbn",
        "library of congress", "table of contents",
        "acknowledgements", "acknowledgments",
        "dedication", "index"
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

async def convert_pdf_to_audio(pdf_bytes: bytes, filename: str) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    # Render-safe temp directory
    temp_dir = tempfile.mkdtemp()
    audio_path = os.path.join(temp_dir, f"{Path(filename).stem}.mp3")

    content_started = False
    is_small_pdf = len(doc) <= 2

    with open(audio_path, "wb") as final_audio:
        for i, page in enumerate(doc):
            raw_text = page.get_text("text")
            if not raw_text:
                continue

            cleaned = clean_page_text(raw_text)
            if not cleaned:
                continue

            if not is_small_pdf and not content_started:
                if i < 10 and is_front_matter(cleaned):
                    continue
                if re.search(r"(chapter\s+\d+|introduction|foreword)", cleaned.lower()):
                    content_started = True
                else:
                    continue

            # IMPORTANT: sequential chunk processing (Render-safe)
            for chunk in chunk_text(cleaned):
                audio_bytes = await tts_chunk(chunk)
                final_audio.write(audio_bytes)
                final_audio.flush()

    doc.close()
    return audio_path

# ------------------ email services ------------------

async def send_email_via_resend(
    to_email: str,
    subject: str,
    html_content: str,
    attachment_path: str,
    attachment_filename: str
) -> bool:
    if not RESEND_API_KEY:
        return False

    try:
        import base64

        with open(attachment_path, "rb") as f:
            attachment_base64 = base64.b64encode(f.read()).decode()

        payload = {
            "from": RESEND_FROM_EMAIL,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "attachments": [{
                "filename": attachment_filename,
                "content": attachment_base64,
                "content_type": "audio/mpeg"
            }]
        }

        headers = {
            "Authorization": f"Bearer {RESEND_API_KEY}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(RESEND_API_URL, json=payload, headers=headers)

        return res.status_code == 200

    except Exception as e:
        print("Resend error:", e)
        return False

async def send_email_via_smtp(
    to_email: str,
    subject: str,
    body: str,
    attachment_path: str,
    attachment_filename: str
) -> bool:
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    from email.mime.base import MIMEBase
    from email import encoders

    try:
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        smtp_port = int(os.getenv("SMTP_PORT", 587))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")

        if not smtp_username or not smtp_password:
            return False

        msg = MIMEMultipart()
        msg["From"] = smtp_username
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        with open(attachment_path, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{attachment_filename}"')
            msg.attach(part)

        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(msg)

        return True

    except Exception as e:
        print("SMTP error:", e)
        return False

# ------------------ background task ------------------

# async def process_and_email_pdf(pdf_bytes: bytes, email: str, filename: str):
async def process_and_email_pdf(pdf_bytes: bytes, email: str, filename: str):
    """Background task to process PDF and send email."""
    temp_dir = None
    try:
        # Convert PDF to audio
        print(f"Starting PDF conversion for: {filename}")
        audio_path = await convert_pdf_to_audio(pdf_bytes, filename)
        temp_dir = os.path.dirname(audio_path)

        # Prepare email content
        audio_filename = os.path.basename(audio_path)
        subject = f"Your Audio File: {Path(filename).stem}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 30px;
                    text-align: center;
                    color: white;
                    border-radius: 10px 10px 0 0;
                }}
                .content {{
                    background: #f9f9f9;
                    padding: 30px;
                    border-radius: 0 0 10px 10px;
                }}
                .btn {{
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 30px;
                    text-decoration: none;
                    border-radius: 5px;
                    font-weight: bold;
                }}
                .footer {{
                    margin-top: 30px;
                    text-align: center;
                    font-size: 12px;
                    color: #666;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Your Audio File is Ready! 🎧</h1>
                </div>
                <div class="content">
                    <p>Hello,</p>
                    <p>Your PDF <strong>"{filename}"</strong> has been successfully converted to an audio file.</p>
                    <p>The audio file <strong>"{audio_filename}"</strong> is attached to this email. 
                       You can download it and listen on any device.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <p><strong>Audio Details:</strong></p>
                        <ul style="text-align: left; display: inline-block;">
                            <li>Format: MP3</li>
                            <li>Voice: Natural English (US)</li>
                            <li>Ready for offline listening</li>
                        </ul>
                    </div>
                    <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
                    <p>Best regards,<br>
                    <strong>The SonifyReads Team</strong></p>
                </div>
                <div class="footer">
                    <p>© {datetime.now().year} SonifyReads. All rights reserved.</p>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </body>
        </html>
        """

        # Try Resend first, fallback to SMTP
        email_sent = False
        
        if RESEND_API_KEY:
            print("Sending email via Resend...")
            email_sent = await send_email_via_resend(
                email, subject, html_content, audio_path, audio_filename
            )
        
        if not email_sent:
            print("Trying SMTP fallback...")
            # Simple text version for SMTP
            text_content = f"""
            Hello,
            
            Your PDF "{filename}" has been successfully converted to audio.
            The audio file "{audio_filename}" is attached to this email.
            You can download and listen to it on any device that supports MP3 files.
            
            Voice: Natural English (US)
            Format: MP3
            
            Thank you for using SonifyReads!
            
            Best regards,
            The SonifyReads Team
            """
            
            email_sent = await send_email_via_smtp(
                email, subject, text_content, audio_path, audio_filename
            )

        if email_sent:
            print(f"Successfully processed and emailed audio for {filename} to {email}")
        else:
            print(f"Failed to send email for {filename}")
            # You might want to log this failure for manual follow-up
            
    except Exception as e:
        print(f"Error in background processing: {str(e)}")
        # Log the error for debugging
        import traceback
        traceback.print_exc()
        
    finally:
        # Clean up temporary directory
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir)
                print(f"Cleaned up temp directory: {temp_dir}")
            except:
                pass
        if temp_dir and os.path.exists(temp_dir):
            shutil.rmtree(temp_dir, ignore_errors=True)

# ------------------ endpoints ------------------

@app.get("/")
def health_check():
    return {"status": "ok"}

@app.post("/convert-pdf-to-audio/")
async def convert_pdf_to_audio_email(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    email: str = Form(...)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files supported")

    pdf_bytes = await file.read()

    if len(pdf_bytes) > 50 * 1024 * 1024:
        raise HTTPException(400, "File too large")

    background_tasks.add_task(
        process_and_email_pdf,
        pdf_bytes,
        email,
        file.filename
    )

    return EmailResponse(
        message="Processing started. You will receive an email shortly.",
        email=email,
        filename=file.filename,
        status="processing"
    )
