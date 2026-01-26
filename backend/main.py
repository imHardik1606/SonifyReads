import os
import re
import fitz
import asyncio
import tempfile
import shutil
import threading
from pathlib import Path
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

import edge_tts

# ---------------- setup ----------------

load_dotenv()

app = FastAPI()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- config ----------------

VOICE = "en-US-GuyNeural"
MAX_CHARS = 3500
TTS_CONCURRENCY = 2
tts_semaphore = asyncio.Semaphore(TTS_CONCURRENCY)

# ---------------- models ----------------

class EmailResponse(BaseModel):
    message: str
    status: str
    filename: str

# ---------------- helpers ----------------

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

def chunk_text(text: str):
    buffer, chunks = "", []
    for sentence in text.split(". "):
        if len(buffer) + len(sentence) > MAX_CHARS:
            chunks.append(buffer.strip())
            buffer = sentence
        else:
            buffer += sentence + ". "
    if buffer:
        chunks.append(buffer.strip())
    return chunks

# ---------------- TTS ----------------

async def tts_chunk(text: str) -> bytes:
    async with tts_semaphore:
        communicate = edge_tts.Communicate(text=text, voice=VOICE)
        audio = bytearray()
        async for msg in communicate.stream():
            if msg["type"] == "audio":
                audio.extend(msg["data"])
        return bytes(audio)

async def convert_pdf_to_audio(pdf_path: str, filename: str) -> str:
    doc = fitz.open(pdf_path)
    temp_dir = tempfile.mkdtemp()
    audio_path = os.path.join(temp_dir, f"{Path(filename).stem}.mp3")

    with open(audio_path, "wb") as out:
        for page in doc:
            text = clean_page_text(page.get_text("text") or "")
            if not text:
                continue
            for chunk in chunk_text(text):
                audio = await tts_chunk(chunk)
                out.write(audio)

    doc.close()
    return audio_path

# ---------------- email ----------------
# Send email with audio attachment using Gmail SMTP
async def send_email(to_email, subject, html, attachment_path, attachment_name):
    try:
        # GMAIL SMTP CONFIG
        SMTP_HOST = "smtp.gmail.com"
        SMTP_PORT = 587

        GMAIL_USER = os.getenv("MAIL_USERNAME")
        GMAIL_PASSWORD = os.getenv("MAIL_PASSWORD")

        print(f"📧 Preparing email to: {to_email}")
        print(f"📎 Attachment: {attachment_name}")

        # CREATE EMAIL
        msg = MIMEMultipart()

        # IMPORTANT: From MUST be your Gmail address
        msg["From"] = f"SonifyReads <{GMAIL_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        # Add HTML body
        msg.attach(MIMEText(html, "html"))

        # ADD AUDIO ATTACHMENT
        print(f"📂 Reading attachment: {attachment_path}")
        with open(attachment_path, "rb") as attachment:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(attachment.read())
            encoders.encode_base64(part)

            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{attachment_name}"'
            )
            part.add_header(
                "Content-Type",
                f'audio/mpeg; name="{attachment_name}"'
            )

            msg.attach(part)

        # SEND VIA GMAIL SMTP
        print("🚀 Connecting to Gmail SMTP...")

        context = ssl.create_default_context()

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls(context=context)

            server.login(GMAIL_USER, GMAIL_PASSWORD)
            server.send_message(msg)

        print(f"✅ Email successfully sent to: {to_email}")
        return True

    except Exception as e:
        print(f"❌ Failed to send email: {str(e)}")
        return False


async def async_worker(pdf_path, email, filename):
    audio_path = None
    try:
        print(f"Starting PDF conversion for: {filename}")
        audio_path = await convert_pdf_to_audio(pdf_path, filename)
        
        # Prepare email content with your original HTML
        audio_filename = os.path.basename(audio_path)
        subject = f"Your Audio File: {Path(filename).stem}.mp3"
        
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
        
        print("Sending email via GMail SMTP...")
        success = await send_email(email, subject, html_content, audio_path, audio_filename)
        
        if success:
            print(f"Successfully processed and emailed audio for {filename} to {email}")
        else:
            print(f"Failed to send email for {filename}")
            
    except Exception as e:
        print(f"Error in background processing: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        # Clean up temporary files
        if audio_path and os.path.exists(os.path.dirname(audio_path)):
            try:
                shutil.rmtree(os.path.dirname(audio_path))
                print(f"Cleaned up temp audio directory: {os.path.dirname(audio_path)}")
            except Exception as e:
                print(f"Error cleaning audio directory: {e}")
        
        if os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
                print(f"Cleaned up temp PDF file: {pdf_path}")
            except Exception as e:
                print(f"Error cleaning PDF file: {e}")

def threaded_worker(pdf_path, email, filename):
    asyncio.run(async_worker(pdf_path, email, filename))

# ---------------- endpoint ----------------

@app.post("/convert-pdf-to-audio/", response_model=EmailResponse)
async def upload_pdf(file: UploadFile = File(...), email: str = Form(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files allowed")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        pdf_path = tmp.name

    threading.Thread(
        target=threaded_worker,
        args=(pdf_path, email, file.filename),
        daemon=True
    ).start()

    return EmailResponse(
        message="Upload complete. Processing started.",
        status="queued",
        filename=file.filename
    )
