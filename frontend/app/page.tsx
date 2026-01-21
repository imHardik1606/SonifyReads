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
  Shield,
  CloudUpload,
  Download,
  X,
  Moon,
  Sun,
  FileAudio,
  Waves,
  Zap,
  BookText,
  Music,
  Globe,
  Mail,
  Loader2,
  AlertCircle,
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
  const [darkMode, setDarkMode] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle email submission
  const handleEmailSubmit = async () => {
    setEmailError("");
    
    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }
    
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    
    setIsProcessing(true);
    // Here you would typically send the email to your backend
    // For now, we'll simulate a delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Close modal and show confirmation
    setShowEmailModal(false);
    setIsProcessing(false);
    setShowConfirmationModal(true);
    
    // Clear the uploaded file
    setFile(null);
    
    // Reset upload progress and states
    setIsUploading(false);
    setUploadProgress(0);
    setConversionComplete(false);
    setAudioUrl(null);
    setText("");
    
    // You would typically make the actual API call here
    // startAudioConversion();
  };

  // Start the audio conversion process
  const startAudioConversion = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setAudioUrl(null);
    setText("");
    setConversionComplete(false);
    setIsPlaying(false);

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 5;
      });
    }, 300);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email); // Send email to backend

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/convert-pdf-to-audio/`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok || !res.body) {
        throw new Error(`Audio stream failed: ${res.status} ${res.statusText}`);
      }

      clearInterval(progressInterval);
      setUploadProgress(95);

      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;

      const url = URL.createObjectURL(mediaSource);
      setAudioUrl(url);

      mediaSource.addEventListener("sourceopen", () => {
        try {
          const sourceBuffer = mediaSource.addSourceBuffer("audio/mpeg");
          const reader = res.body!.getReader();

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                if (value) {
                  const chunkArray = new Uint8Array(value);
                  await appendChunk(sourceBuffer, chunkArray);
                }
              }

              const waitForUpdate = (): Promise<void> => {
                return new Promise<void>((resolve) => {
                  if (sourceBuffer.updating) {
                    const handler = () => {
                      sourceBuffer.removeEventListener('updateend', handler);
                      resolve();
                    };
                    sourceBuffer.addEventListener('updateend', handler);
                  } else {
                    resolve();
                  }
                });
              };

              await waitForUpdate();
              mediaSource.endOfStream();
              
              setUploadProgress(100);
              setConversionComplete(true);
              setIsUploading(false);
              setText(`"${file.name}" converted to audio successfully. Streaming ready!`);
            } catch (err) {
              console.error("Stream processing error:", err);
              setError("Failed to process audio stream");
              setIsUploading(false);
            }
          };

          processStream();
        } catch (err) {
          console.error("Source buffer error:", err);
          setError("Failed to initialize audio stream");
          setIsUploading(false);
        }
      });

      mediaSource.addEventListener("error", (e) => {
        console.error("MediaSource error:", e);
        setError("Audio stream error occurred");
        setIsUploading(false);
      });

    } catch (error) {
      console.error("Upload failed:", error);
      setError(error instanceof Error ? error.message : "Conversion failed");
      setIsUploading(false);
      setUploadProgress(0);
      clearInterval(progressInterval);
    }
  };

  // Modified upload function to show modal
  const handleUploadPdf = () => {
    if (!file) return;
    
    setShowEmailModal(true);
  };

  // Safe Source Buffer Append Function with Buffer Management
  const appendChunk = (sourceBuffer: SourceBuffer, chunk: Uint8Array): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      const BUFFER_SIZE_LIMIT = 30 * 1024 * 1024;
      const MAX_BUFFER_DURATION = 120;
      
      try {
        if (sourceBuffer.buffered.length > 0) {
          const currentTime = audioRef.current?.currentTime || 0;
          const bufferStart = sourceBuffer.buffered.start(0);
          const bufferEnd = sourceBuffer.buffered.end(sourceBuffer.buffered.length - 1);
          
          if (currentTime > 10 && bufferStart < currentTime - 10) {
            try {
              sourceBuffer.remove(bufferStart, currentTime - 10);
            } catch (e) {
              console.warn("Failed to remove old buffer:", e);
            }
          }
          
          if (bufferEnd - bufferStart > MAX_BUFFER_DURATION) {
            const removeEnd = bufferStart + (bufferEnd - bufferStart - MAX_BUFFER_DURATION / 2);
            try {
              sourceBuffer.remove(bufferStart, Math.min(removeEnd, bufferEnd));
            } catch (e) {
              console.warn("Failed to trim buffer:", e);
            }
          }
        }
        
        const onUpdateEnd = () => {
          sourceBuffer.removeEventListener('updateend', onUpdateEnd);
          resolve();
        };

        const onError = (err: Event) => {
          sourceBuffer.removeEventListener('error', onError);
          reject(err);
        };

        if (sourceBuffer.updating) {
          sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true });
          sourceBuffer.addEventListener('error', onError, { once: true });
        } else {
          try {
            const buffer = new ArrayBuffer(chunk.byteLength);
            const view = new Uint8Array(buffer);
            view.set(chunk);
            
            sourceBuffer.appendBuffer(buffer);
            sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true });
            sourceBuffer.addEventListener('error', onError, { once: true });
          } catch (err) {
            reject(err);
          }
        }
      } catch (err) {
        reject(err);
      }
    });
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
    setUploadProgress(0);
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      setError(
        "Live streaming download requires a separate endpoint. For download support, contact support."
      );
    }
  };

  const steps = [
    {
      number: "01",
      title: "Upload Ebook",
      description: "Upload PDF, EPUB, or MOBI file",
      icon: <Upload className="h-5 w-5" />,
    },
    {
      number: "02",
      title: "AI Processing",
      description: "Convert text to natural speech",
      icon: <Waves className="h-5 w-5" />,
    },
    {
      number: "03",
      title: "Listen Anywhere",
      description: "Download and enjoy your audio",
      icon: <Headphones className="h-5 w-5" />,
    },
  ];

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (mediaSourceRef.current) {
        mediaSourceRef.current = null;
      }
    };
  }, [audioUrl]);

  return (
    <div className={`min-h-screen transition-all duration-500 font-sans ${
      darkMode 
        ? "bg-linear-to-br from-gray-900 via-slate-900 to-gray-950 text-gray-100"
        : "bg-linear-to-br from-blue-50 via-white to-indigo-50/30 text-gray-900"
    }`}>
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Poppins:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap"
        rel="stylesheet"
      />
      
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 -left-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute bottom-1/4 right-1/3 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isProcessing && setShowEmailModal(false)}
          />
          
          {/* Modal */}
          <div className={`relative z-10 w-full max-w-md rounded-3xl p-8 backdrop-blur-lg shadow-2xl border transition-all duration-300 animate-slide-up ${
            darkMode
              ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
              : "bg-linear-to-br from-white/90 to-white/70 border-white/30"
          }`}>
            {/* Close Button */}
            {!isProcessing && (
              <button
                onClick={() => setShowEmailModal(false)}
                className={`absolute top-4 right-4 p-2 rounded-lg transition-all duration-300 ${
                  darkMode
                    ? "bg-white/10 hover:bg-white/20 border border-white/20"
                    : "bg-white/80 hover:bg-white border border-gray-200"
                } shadow-lg hover:shadow-xl hover:scale-105`}
              >
                <X className="h-5 w-5" />
              </button>
            )}

            <div className="flex items-center space-x-3 mb-6">
              <div className={`p-3 rounded-xl ${
                darkMode ? "bg-white/10" : "bg-white/60"
              }`}>
                <Mail className="h-6 w-6 bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-heading">Processing Your Audio</h2>
                <p className={`text-sm mt-1 ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}>
                  We'll email you when it's ready
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className={`p-4 rounded-xl ${
                darkMode ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50/50 border border-blue-200"
              }`}>
                <div className="flex items-start space-x-3">
                  <AlertCircle className={`h-5 w-5 mt-0.5 ${darkMode ? "text-blue-400" : "text-blue-500"}`} />
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
                      This may take a few minutes
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? "text-blue-400/80" : "text-blue-600/80"}`}>
                      Your PDF is being converted to audio. Enter your email and we'll send you the audio file when it's ready.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isProcessing}
                      className={`w-full px-4 py-3 rounded-xl transition-all duration-300 ${
                        darkMode
                          ? "bg-white/10 border border-white/20 focus:border-blue-500 text-white"
                          : "bg-white/60 border border-gray-200 focus:border-blue-400 text-gray-900"
                      } focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                      placeholder="you@example.com"
                    />
                    <Mail className={`absolute right-3 top-3 h-5 w-5 ${
                      darkMode ? "text-gray-400" : "text-gray-400"
                    } ${isProcessing ? "opacity-50" : ""}`} />
                  </div>
                  {emailError && (
                    <p className="text-red-500 text-sm mt-2 flex items-center">
                      <X className="h-4 w-4 mr-1" /> {emailError}
                    </p>
                  )}
                </div>

                <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                  <p>We'll send the audio file to this email address once conversion is complete.</p>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                {!isProcessing && (
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 ${
                      darkMode
                        ? "bg-white/10 hover:bg-white/20 border border-white/20"
                        : "bg-gray-100 hover:bg-gray-200 border border-gray-200"
                    }`}
                  >
                    Cancel
                  </button>
                )}
                <button
                  onClick={handleEmailSubmit}
                  disabled={isProcessing}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg ${
                    isProcessing
                      ? "bg-linear-to-r from-blue-500 to-purple-500"
                      : "bg-linear-to-r from-blue-500 to-purple-500 hover:shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5"
                  } text-white relative overflow-hidden group`}
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    <span className="relative z-10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Start Conversion
                    </span>
                  )}
                  <div className="absolute inset-0 bg-linear-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowConfirmationModal(false)}
          />
          
          {/* Modal */}
          <div className={`relative z-10 w-full max-w-md rounded-3xl p-8 backdrop-blur-lg shadow-2xl border transition-all duration-300 animate-slide-up ${
            darkMode
              ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
              : "bg-linear-to-br from-white/90 to-white/70 border-white/30"
          }`}>
            <div className="text-center">
              {/* Success Icon */}
              <div className="relative inline-block mb-6">
                <div className={`h-20 w-20 rounded-full flex items-center justify-center ${
                  darkMode 
                    ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20" 
                    : "bg-gradient-to-br from-green-50 to-emerald-50"
                } animate-scale-up`}>
                  <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                    darkMode 
                      ? "bg-gradient-to-br from-green-500/30 to-emerald-500/30" 
                      : "bg-gradient-to-br from-green-100 to-emerald-100"
                  }`}>
                    <CheckCircle className="h-10 w-10 text-green-500 animate-bounce" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-4 border-green-500/30 animate-ping-slow"></div>
                </div>
              </div>

              <h2 className="text-2xl font-bold font-heading mb-3">
                Processing Started
              </h2>
              
              <p className={`text-lg mb-6 leading-relaxed ${
                darkMode ? "text-gray-300" : "text-gray-600"
              }`}>
                Your audio file will be emailed to you shortly after processing
              </p>

              <div className={`p-4 rounded-xl mb-6 ${
                darkMode ? "bg-blue-500/10 border border-blue-500/20" : "bg-blue-50/50 border border-blue-200"
              }`}>
                <div className="flex items-start space-x-3">
                  <Mail className={`h-5 w-5 mt-0.5 ${darkMode ? "text-blue-400" : "text-blue-500"}`} />
                  <div className="text-left">
                    <p className={`text-sm font-medium ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
                      Check your inbox
                    </p>
                    <p className={`text-xs mt-1 ${darkMode ? "text-blue-400/80" : "text-blue-600/80"}`}>
                      We'll send the audio file to: <span className="font-semibold">{email}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className={`text-sm mb-8 ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                <p className="mb-2">• Processing typically takes 2-5 minutes</p>
                <p className="mb-2">• You can upload another file anytime</p>
                <p>• Check spam folder if you don't see the email</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setEmail(""); // Clear email for next use
                  }}
                  className={`flex-1 py-3 rounded-xl font-medium transition-all duration-300 shadow-lg ${
                    darkMode
                      ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-green-500/25"
                      : "bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-green-500/25"
                  } text-white hover:shadow-xl hover:-translate-y-0.5 relative overflow-hidden group`}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Upload Another File
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </button>
                
                <button
                  onClick={() => {
                    setShowConfirmationModal(false);
                    setEmail(""); // Clear email for next use
                  }}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
                    darkMode
                      ? "bg-white/10 hover:bg-white/20 border border-white/20"
                      : "bg-gray-100 hover:bg-gray-200 border border-gray-200"
                  }`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative px-4 py-6 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl backdrop-blur-sm transition-all duration-300 ${
              darkMode 
                ? "bg-white/10 border border-white/20 hover:bg-white/20"
                : "bg-white/80 border border-white/20 hover:bg-white"
            } shadow-lg hover:shadow-xl`}>
              <Music className="h-6 w-6 bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-purple-500" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-display tracking-tight">
                SonifyReads
              </span>
              <p className="text-xs mt-1 opacity-75 font-sans font-light tracking-wide">
                REAL-TIME AUDIO STREAMING
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg backdrop-blur-sm transition-all duration-300 group ${
                darkMode
                  ? "bg-white/10 hover:bg-white/20 border border-white/20"
                  : "bg-white/80 hover:bg-white border border-gray-200"
              } shadow-lg hover:shadow-xl hover:scale-105`}
            >
              {darkMode ? (
                <Sun className="h-8 w-8 text-yellow-400 rounded-md group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="h-8 w-8 text-gray-700 rounded-md group-hover:rotate-12 transition-transform" />
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="relative px-4 py-12 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-16 pt-8 animate-fade-in">
            <div className={`inline-flex items-center space-x-2 mb-6 px-5 py-2.5 rounded-full backdrop-blur-sm ${
              darkMode
                ? "bg-white/10 border border-white/20"
                : "bg-blue-400/20 border border-white/20"
            } shadow-lg animate-pulse`}>
              <Sparkles className="h-4 w-4 text-blue-500 animate-spin-slow" />
              <span className="font-medium bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-sans tracking-wide text-sm">
                Real-Time Audio Streaming
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-5xl mx-auto animate-slide-up leading-tight font-display">
              <span className="bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Stream Words
              </span>
              <br />
              <span className={darkMode ? "text-white" : "text-gray-900"}>
                Into{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-linear-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Live Audio
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-linear-to-r from-blue-500 to-purple-500 rounded-full opacity-75"></div>
                </span>
              </span>
            </h1>

            <p className={`text-lg md:text-xl mb-10 max-w-3xl mx-auto animate-slide-up delay-100 leading-relaxed font-body ${
              darkMode ? "text-gray-300/90" : "text-gray-600/90"
            }`}>
              Convert documents into streaming audio experiences. Listen as your content is processed in real-time with AI-powered narration.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div className={`px-4 py-2 rounded-full backdrop-blur-sm ${
                darkMode ? "bg-white/5" : "bg-white/50"
              }`}>
                <span className="text-sm font-medium flex items-center gap-2">
                  <Waves className="h-4 w-4 text-blue-500" />
                  Live Streaming
                </span>
              </div>
              <div className={`px-4 py-2 rounded-full backdrop-blur-sm ${
                darkMode ? "bg-white/5" : "bg-white/50"
              }`}>
                <span className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  40+ Languages
                </span>
              </div>
              <div className={`px-4 py-2 rounded-full backdrop-blur-sm ${
                darkMode ? "bg-white/5" : "bg-white/50"
              }`}>
                <span className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Real-time Processing
                </span>
              </div>
            </div>
          </section>

          {/* Main Conversion Section */}
          <section className="mb-20">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Upload & Conversion Card */}
              <div className={`rounded-3xl p-8 backdrop-blur-lg shadow-2xl transition-all duration-300 hover:shadow-3xl border ${
                darkMode
                  ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
                  : "bg-linear-to-br from-white/90 to-white/70 border-white/30"
              }`}>
                <div className="flex items-center space-x-3 mb-8">
                  <div className={`p-3 rounded-xl ${
                    darkMode ? "bg-white/10" : "bg-white/60"
                  }`}>
                    <CloudUpload className="h-6 w-6 bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold font-heading">Stream Your Document</h2>
                    <p className={`text-sm mt-1 ${
                      darkMode ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Upload and stream audio in real-time
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-center w-full">
                    <label className={`flex flex-col items-center justify-center w-full h-64 rounded-2xl cursor-pointer transition-all duration-300 group ${
                      darkMode
                        ? "border-2 border-dashed border-white/20 hover:border-blue-500/50 bg-white/5 hover:bg-white/10"
                        : "border-2 border-dashed border-gray-300 hover:border-blue-400 bg-white/50 hover:bg-blue-50/50"
                    } hover:scale-[1.02]`}>
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 p-4">
                        {file ? (
                          <>
                            <div className="relative">
                              <FileAudio className="h-12 w-12 text-blue-500 mb-4 animate-bounce" />
                              <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                            <p className={`mb-2 text-lg font-semibold text-center font-sans ${
                              darkMode ? "text-gray-100" : "text-gray-700"
                            }`}>
                              {file.name}
                            </p>
                            <p className={`text-sm mb-4 font-medium ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}>
                              {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready to stream
                            </p>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleClearFile();
                              }}
                              className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                                darkMode
                                  ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                                  : "bg-red-100 text-red-600 hover:bg-red-200"
                              }`}
                            >
                              Remove File
                            </button>
                          </>
                        ) : (
                          <>
                            <Upload className={`h-12 w-12 mb-4 transition-transform group-hover:scale-110 ${
                              darkMode ? "text-gray-400" : "text-gray-400"
                            }`} />
                            <p className={`mb-2 text-lg text-center font-heading ${
                              darkMode ? "text-gray-100" : "text-gray-700"
                            }`}>
                              <span className="font-bold">Drop your file here</span>
                            </p>
                            <p className={`text-sm text-center max-w-xs ${
                              darkMode ? "text-gray-400" : "text-gray-500"
                            }`}>
                              Supports PDF, EPUB, DOCX up to 50MB
                            </p>
                            <div className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
                              darkMode ? "bg-white/10" : "bg-blue-500/10"
                            }`}>
                              <span className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Secure & private streaming
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept=".pdf,.epub,.docx,application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>
                  </div>

                  {error && (
                    <div className={`mt-4 p-4 rounded-xl border backdrop-blur-sm animate-shake ${
                      darkMode
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-red-50 border-red-200"
                    }`}>
                      <div className="flex items-center text-red-500">
                        <X className="h-5 w-5 mr-2 shrink-0" />
                        <span className="font-medium font-sans">{error}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {isUploading && (
                    <div className={`p-4 rounded-xl ${
                      darkMode ? "bg-white/5" : "bg-blue-50/50"
                    }`}>
                      <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                          {uploadProgress >= 95 ? "Finalizing stream..." : "Streaming audio..."}
                        </span>
                        <span className="font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                          {uploadProgress.toFixed(0)}%
                        </span>
                      </div>
                      <div className={`w-full rounded-full h-2.5 overflow-hidden ${
                        darkMode ? "bg-white/10" : "bg-gray-100"
                      }`}>
                        <div
                          className="bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 h-2.5 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      {uploadProgress >= 95 && (
                        <p className="text-xs mt-2 text-center text-blue-500">
                          Audio streaming will begin shortly...
                        </p>
                      )}
                    </div>
                  )}

                  <button
                    onClick={handleUploadPdf}
                    disabled={!file || isUploading}
                    className={`w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center group relative overflow-hidden font-heading ${
                      conversionComplete
                        ? "bg-linear-to-r from-green-500 to-emerald-500 hover:shadow-green-500/25"
                        : "bg-linear-to-r from-blue-500 to-purple-500 hover:shadow-blue-500/25"
                    } hover:shadow-xl hover:-translate-y-0.5 text-white`}
                  >
                    <div className="absolute inset-0 bg-linear-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative z-10 flex items-center">
                      {isUploading ? (
                        <>
                          <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                          Streaming...
                        </>
                      ) : conversionComplete ? (
                        <>
                          <CheckCircle className="h-6 w-6 mr-3" />
                          Stream Complete!
                        </>
                      ) : (
                        <>
                          <Headphones className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" />
                          Stream Audio
                        </>
                      )}
                    </span>
                  </button>

                  {conversionComplete && audioUrl && (
                    <div className="grid grid-cols-2 gap-3 animate-fade-in">
                      <button
                        onClick={handlePlayAudio}
                        className="py-3 bg-linear-to-r from-green-500 to-emerald-500 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-green-500/25 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-linear-to-r from-emerald-500 to-green-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative z-10 flex items-center">
                          {isPlaying ? (
                            <>
                              <Pause className="h-5 w-5 mr-2" />
                              Pause Audio
                            </>
                          ) : (
                            <>
                              <Play className="h-5 w-5 mr-2" />
                              Play Stream
                            </>
                          )}
                        </span>
                      </button>
                      <button
                        onClick={handleDownloadAudio}
                        className="py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium transition-all duration-300 hover:shadow-purple-500/25 hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center group relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-linear-to-r from-pink-500 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative z-10 flex items-center">
                          <Download className="h-5 w-5 mr-2" />
                          Download
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Audio Player & Steps */}
              <div className="space-y-6">
                {/* Steps */}
                <div className={`rounded-3xl p-6 backdrop-blur-lg shadow-xl border ${
                  darkMode
                    ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
                    : "bg-linear-to-br from-white/80 to-white/60 border-white/20"
                }`}>
                  <h3 className="text-2xl font-bold mb-8 font-heading">
                    How Streaming Works
                    <div className="h-1 w-16 bg-linear-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                  </h3>
                  <div className="space-y-6">
                    {steps.map((step, index) => (
                      <div 
                        key={index} 
                        className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] group ${
                          darkMode
                            ? "hover:bg-white/5"
                            : "hover:bg-white/60"
                        } animate-slide-up`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="shrink-0">
                          <div className={`h-14 w-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                            darkMode
                              ? "bg-linear-to-br from-blue-500/20 to-purple-500/20 border border-white/10"
                              : "bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-white/20"
                          }`}>
                            <span className="font-bold text-2xl bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-display">
                              {step.number}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-lg font-heading">{step.title}</h4>
                            <div className="text-blue-500 group-hover:scale-125 transition-transform">
                              {step.icon}
                            </div>
                          </div>
                          <p className={`leading-relaxed ${
                            darkMode ? "text-gray-400" : "text-gray-600"
                          } font-body`}>
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div className={`rounded-3xl p-6 backdrop-blur-lg shadow-xl border ${
                  darkMode
                    ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
                    : "bg-linear-to-br from-white/80 to-white/60 border-white/20"
                }`}>
                  <h3 className="text-xl font-bold mb-4 font-heading">Streaming Features</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className={`p-3 rounded-lg text-center transition-all duration-300 hover:scale-105 ${
                      darkMode ? "bg-white/5" : "bg-white/50"
                    }`}>
                      <div className="text-2xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-1 font-display">
                        Live
                      </div>
                      <div className="text-xs font-medium">Streaming</div>
                    </div>
                    <div className={`p-3 rounded-lg text-center transition-all duration-300 hover:scale-105 ${
                      darkMode ? "bg-white/5" : "bg-white/50"
                    }`}>
                      <div className="text-2xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-1 font-display">
                        50+
                      </div>
                      <div className="text-xs font-medium">Voices</div>
                    </div>
                    <div className={`p-3 rounded-lg text-center transition-all duration-300 hover:scale-105 ${
                      darkMode ? "bg-white/5" : "bg-white/50"
                    }`}>
                      <div className="text-2xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-1 font-display">
                        <Waves className="inline h-5 w-5" />
                      </div>
                      <div className="text-xs font-medium">Real-time</div>
                    </div>
                    <div className={`p-3 rounded-lg text-center transition-all duration-300 hover:scale-105 ${
                      darkMode ? "bg-white/5" : "bg-white/50"
                    }`}>
                      <div className="text-2xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-1 font-display">
                        24/7
                      </div>
                      <div className="text-xs font-medium">Support</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative px-4 py-8 md:px-8 lg:px-16 mt-12">
        <div className="max-w-7xl mx-auto">
          <div className={`rounded-3xl p-8 backdrop-blur-lg border ${
            darkMode
              ? "bg-white/5 border-white/10"
              : "bg-white/80 border-white/20"
          } shadow-xl`}>
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-4 md:mb-0">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    darkMode ? "bg-white/10" : "bg-white/60"
                  }`}>
                    <Music className="h-6 w-6 bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-purple-500" />
                  </div>
                  <div>
                    <span className="text-xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-display">
                      SonifyReads
                    </span>
                    <p className={`text-xs mt-1 font-light tracking-wider ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}>
                      Real-time audio streaming
                    </p>
                  </div>
                </div>
              </div>
              <div className={`text-center md:text-right ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                <p className="font-medium">© {new Date().getFullYear()} SonifyReads</p>
                <p className="text-sm mt-1 font-light">All rights reserved</p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom CSS */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slide-up {
          from { 
            opacity: 0;
            transform: translateY(30px);
          }
          to { 
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes scale-up {
          from { 
            opacity: 0;
            transform: scale(0.8);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes ping-slow {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-slide-up {
          animation: slide-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          opacity: 0;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }

        .animate-scale-up {
          animation: scale-up 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }

        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
}