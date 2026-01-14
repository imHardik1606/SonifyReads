"use client";

import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Headphones,
  BookOpen,
  Play,
  Pause,
  CheckCircle,
  Sparkles,
  Volume2,
  Zap,
  Shield,
  CloudUpload,
  Download,
  X,
} from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [conversionComplete, setConversionComplete] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const uploadPdf = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setAudioUrl(null);
    setText("");
    setConversionComplete(false);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/extract-text/`,
        {
          method: "POST",
          body: formData,
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Upload failed: ${res.status} ${errorText}`);
      }

      // Create a blob from the audio stream
      const audioBlob = await res.blob();
      
      // Create object URL for the audio blob
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      
      // Set conversion complete
      setIsUploading(false);
      setConversionComplete(true);
      
      // Extract text from filename for preview (since we don't get text from backend)
      // In a real app, you might want a separate endpoint to get extracted text
      setText(`"${file.name}" converted to audio successfully. Ready to play!`);

    } catch (error) {
      console.error("Upload failed:", error);
      setError(error instanceof Error ? error.message : "Conversion failed");
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setConversionComplete(false);
      setAudioUrl(null);
      setText("");
      setError(null);
    }
  };

  const handlePlayAudio = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setAudioUrl(null);
    setText("");
    setConversionComplete(false);
    setError(null);
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      const link = document.createElement('a');
      link.href = audioUrl;
      link.download = file ? `${file.name.replace(/\.[^/.]+$/, "")}.mp3` : 'audiobook.mp3';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const steps = [
    {
      number: "01",
      title: "Upload Ebook",
      description: "Upload your PDF, EPUB, or MOBI file",
    },
    {
      number: "02",
      title: "Convert to Audio",
      description: "AI processes text into natural speech",
    },
    {
      number: "03",
      title: "Download & Listen",
      description: "Get your audio file and enjoy anywhere",
    },
  ];

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="px-4 py-6 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-linear-to-r from-blue-500 to-indigo-500 rounded-lg">
              <Headphones className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              EbookToAudio
            </span>
          </div>
          <button className="px-6 py-2 bg-linear-to-r from-blue-500 to-indigo-500 text-white rounded-full font-medium hover:opacity-90 transition shadow-lg">
            Get Started
          </button>
        </div>
      </header>

      <main className="px-4 py-12 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-16 pt-8">
            <div className="inline-flex items-center space-x-2 mb-6 px-4 py-2 bg-blue-100 rounded-full">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-blue-600 font-medium">
                Turn Books into Audio Experiences
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 max-w-3xl mx-auto">
              Transform Your{" "}
              <span className="bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Ebooks
              </span>{" "}
              into Audio Books
            </h1>

            <p className="text-lg text-slate-600 mb-10 max-w-2xl mx-auto">
              Convert any PDF to high-quality audio. Listen to your
              favorite books while commuting, working out, or relaxing.
            </p>
          </section>

          {/* Main Conversion Section */}
          <section className="mb-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              {/* Upload & Conversion Card */}
              <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                <div className="flex items-center space-x-3 mb-8">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <CloudUpload className="h-6 w-6 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Convert Your PDF
                  </h2>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 transition bg-slate-50 hover:bg-blue-50">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {file ? (
                          <>
                            <BookOpen className="h-12 w-12 text-blue-600 mb-4" />
                            <p className="mb-2 text-lg text-slate-700 font-semibold">
                              {file.name}
                            </p>
                            <p className="text-sm text-slate-500 mb-4">
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleClearFile();
                              }}
                              className="px-4 py-2 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                            >
                              Remove File
                            </button>
                          </>
                        ) : (
                          <>
                            <Upload className="h-12 w-12 text-slate-400 mb-4" />
                            <p className="mb-2 text-lg text-slate-700">
                              <span className="font-semibold">Click to upload</span>{" "}
                              or drag and drop
                            </p>
                            <p className="text-sm text-slate-500">
                              PDF files up to 50MB
                            </p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                      <div className="flex items-center text-red-700">
                        <X className="h-5 w-5 mr-2" />
                        <span className="font-medium">{error}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mb-6">
                  {isUploading && (
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">Processing PDF...</span>
                        <span className="text-blue-600 font-medium">
                          {uploadProgress}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div
                          className="bg-linear-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={uploadPdf}
                    disabled={!file || isUploading}
                    className="w-full py-4 bg-linear-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-medium text-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center"
                  >
                    {isUploading ? (
                      <>
                        <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        Converting...
                      </>
                    ) : conversionComplete ? (
                      <>
                        <CheckCircle className="h-6 w-6 mr-3" />
                        Conversion Complete!
                      </>
                    ) : (
                      <>
                        <Headphones className="h-6 w-6 mr-3" />
                        Convert to Audio
                      </>
                    )}
                  </button>

                  {conversionComplete && audioUrl && (
                    <div className="mt-4 space-y-3">
                      <button
                        onClick={handlePlayAudio}
                        className="w-full py-3 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-5 w-5 mr-2" />
                            Pause Audio
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5 mr-2" />
                            Play Audio Preview
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleDownloadAudio}
                        className="w-full py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium hover:opacity-90 transition flex items-center justify-center"
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Download MP3
                      </button>
                    </div>
                  )}
                </div>

                <div className="text-center text-slate-500 text-sm">
                  <p>
                    Your file is securely processed and never stored on our
                    servers
                  </p>
                </div>
              </div>

              {/* Preview & Audio Player */}
              <div className="space-y-8">
              
                {/* Audio Player */}
                {audioUrl && (
                  <div className="bg-linear-to-br from-blue-500 to-indigo-500 rounded-2xl p-8 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-4">
                      Audio Player
                    </h3>
                    <div className="space-y-4">
                      <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                        <audio
                          ref={audioRef}
                          src={audioUrl}
                          controls
                          controlsList="nodownload"
                          className="w-full"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                          onEnded={() => setIsPlaying(false)}
                        />
                      </div>
                      <div className="flex items-center text-white/90 text-xl">
                        <Headphones className="h-5 w-5 mr-2" />
                        <span>Ready to listen! Audio file generated successfully.</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Steps */}
                <div className="bg-white rounded-2xl p-8 border border-slate-100 shadow-lg">
                  <h3 className="text-xl font-bold text-slate-800 mb-6">
                    How It Works
                  </h3>
                  <div className="space-y-6">
                    {steps.map((step, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="shrink-0">
                          <div className="h-12 w-12 bg-linear-to-r from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center">
                            <span className="text-blue-700 font-bold">
                              {step.number}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800">
                            {step.title}
                          </h4>
                          <p className="text-slate-600">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-4 py-8 md:px-8 lg:px-16 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="p-2 bg-linear-to-r from-blue-500 to-indigo-500 rounded-lg">
                <Headphones className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold bg-linear-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                EbookToAudio
              </span>
            </div>
            <div className="text-slate-600 text-center md:text-right">
              <p>
                © {new Date().getFullYear()} EbookToAudio. All rights reserved.
              </p>
              <p className="text-sm mt-1">
                Turning books into audio experiences
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}