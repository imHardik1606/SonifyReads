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
  Send,
  Clock,
} from "lucide-react";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
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
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement>(null);
  const uploadStartTime = useRef<number>(0);

  // Email validation function
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Calculate estimated time remaining
  const calculateEstimatedTime = (progress: number) => {
    if (progress === 0 || !uploadStartTime.current) return "";

    const elapsedTime = (Date.now() - uploadStartTime.current) / 1000; // in seconds
    const estimatedTotalTime = elapsedTime / (progress / 100);
    const remainingTime = estimatedTotalTime - elapsedTime;

    if (remainingTime < 60) {
      return `${Math.ceil(remainingTime)} seconds`;
    } else {
      return `${Math.ceil(remainingTime / 60)} minutes`;
    }
  };

  // Handle email submission with progress tracking
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

    if (!file) {
      setEmailError("Please upload a file first");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Preparing upload...");
    setUploadProgress(0);
    setEstimatedTime("");
    uploadStartTime.current = Date.now();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      setProcessingStatus("Uploading PDF...");

      // Use XMLHttpRequest for better progress tracking
      const xhr = new XMLHttpRequest();

      return new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(Math.round(percentComplete));
            setEstimatedTime(calculateEstimatedTime(percentComplete));
          }
        });

        xhr.upload.addEventListener("load", () => {
          setProcessingStatus("Processing PDF...");
        });

        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            clearTimeout(timeoutId);

            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);

                // Show confirmation popup
                setShowConfirmationModal(true);
                setShowEmailModal(false);
                setIsProcessing(false);
                setProcessingStatus("");
                setUploadProgress(0);
                setEstimatedTime("");

                // Clear the uploaded file
                handleClearFile();

                resolve();
              } catch (error) {
                console.error("Response parsing failed:", error);
                setError("Failed to parse server response");
                setIsProcessing(false);
                setProcessingStatus("");
                setUploadProgress(0);
                reject(error);
              }
            } else {
              console.error("Upload failed:", xhr.status, xhr.statusText);
              setError(`Upload failed: ${xhr.status} ${xhr.statusText}`);
              setIsProcessing(false);
              setProcessingStatus("");
              setUploadProgress(0);
              reject(new Error(`Upload failed: ${xhr.status}`));
            }
          }
        };

        xhr.onerror = () => {
          clearTimeout(timeoutId);
          console.error("Network error during upload");
          setError("Network error. Please check your connection.");
          setIsProcessing(false);
          setProcessingStatus("");
          setUploadProgress(0);
          reject(new Error("Network error"));
        };

        xhr.ontimeout = () => {
          console.error("Upload timeout");
          setError("Upload timed out. Please try again.");
          setIsProcessing(false);
          setProcessingStatus("");
          setUploadProgress(0);
          reject(new Error("Upload timeout"));
        };

        // Set timeout for the request
        xhr.timeout = 300000; // 5 minutes

        xhr.open(
          "POST",
          `${process.env.NEXT_PUBLIC_API_URL}/convert-pdf-to-audio/`,
        );
        xhr.send(formData);
      });
    } catch (error) {
      console.error("Upload failed:", error);

      if (error instanceof Error && error.name === "AbortError") {
        setError("Upload was cancelled or timed out");
      } else {
        setError(error instanceof Error ? error.message : "Conversion failed");
      }

      setIsProcessing(false);
      setProcessingStatus("");
      setUploadProgress(0);
      setEstimatedTime("");
    }
  };

  // Alternative fetch-based upload (if you prefer fetch API)
  const handleEmailSubmitWithFetch = async () => {
    setEmailError("");

    if (!email.trim()) {
      setEmailError("Email is required");
      return;
    }

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (!file) {
      setEmailError("Please upload a file first");
      return;
    }

    setIsProcessing(true);
    setProcessingStatus("Preparing upload...");
    setUploadProgress(0);
    setEstimatedTime("");
    uploadStartTime.current = Date.now();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("email", email);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      setProcessingStatus("Uploading PDF...");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/convert-pdf-to-audio/`,
        {
          method: "POST",
          body: formData,
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Show confirmation popup
      setShowConfirmationModal(true);
      setShowEmailModal(false);
      setIsProcessing(false);
      setProcessingStatus("");
      setUploadProgress(0);
      setEstimatedTime("");

      // Clear the uploaded file
      handleClearFile();
    } catch (error) {
      console.error("Upload failed:", error);

      // Check if it's a timeout error
      if (error instanceof DOMException && error.name === "AbortError") {
        setError(
          "Upload timed out. Please try again with a smaller file or check your connection.",
        );
      } else {
        setError(error instanceof Error ? error.message : "Conversion failed");
      }

      setIsProcessing(false);
      setProcessingStatus("");
      setUploadProgress(0);
      setEstimatedTime("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith(".pdf")) {
        setError("Only PDF files are supported");
        return;
      }

      if (selectedFile.size > 50 * 1024 * 1024) {
        setError("File too large. Maximum size is 50MB");
        return;
      }

      setFile(selectedFile);
      setConversionComplete(false);
      setAudioUrl(null);
      setText("");
      setError(null);
      setUploadProgress(0);
      setEstimatedTime("");
    }
  };

  // Modified upload function to show modal
  const handleUploadPdf = () => {
    if (!file) {
      setError("Please select a PDF file first");
      return;
    }

    setShowEmailModal(true);
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
    setEmail("");
    setUploadProgress(0);
    setEstimatedTime("");
  };

  const handleDownloadAudio = () => {
    if (audioUrl) {
      setError(
        "Live streaming download requires a separate endpoint. For download support, contact support.",
      );
    }
  };

  const steps = [
    {
      number: "01",
      title: "Upload PDF",
      description: "Upload your PDF file (max 50MB)",
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
      title: "Email Delivery",
      description: "Receive audio file via email",
      icon: <Mail className="h-5 w-5" />,
    },
  ];

  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <div
      className={`min-h-screen transition-all duration-500 font-sans ${
        darkMode
          ? "bg-linear-to-br from-gray-900 via-slate-900 to-gray-950 text-gray-100"
          : "bg-linear-to-br from-blue-50 via-white to-indigo-50/30 text-gray-900"
      }`}
    >
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
          <div
            className={`relative z-10 w-full max-w-md rounded-3xl p-8 backdrop-blur-lg shadow-2xl border transition-all duration-300 animate-slide-up ${
              darkMode
                ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
                : "bg-linear-to-br from-white/90 to-white/70 border-white/30"
            }`}
          >
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
              <div
                className={`p-3 rounded-xl ${
                  darkMode ? "bg-white/10" : "bg-white/60"
                }`}
              >
                <Mail className="h-6 w-6 bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent" />
              </div>
              <div>
                <h2 className="text-2xl font-bold font-heading">
                  Process Your PDF
                </h2>
                <p
                  className={`text-sm mt-1 ${
                    darkMode ? "text-gray-400" : "text-gray-600"
                  }`}
                >
                  We'll email you the audio file
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* File info */}
              {file && (
                <div
                  className={`p-4 rounded-xl border ${
                    darkMode
                      ? "bg-blue-500/5 border-blue-500/20"
                      : "bg-blue-50/50 border-blue-200"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FileAudio
                      className={`h-5 w-5 ${darkMode ? "text-blue-400" : "text-blue-500"}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p
                        className={`text-sm ${darkMode ? "text-blue-300/80" : "text-blue-600/80"}`}
                      >
                        {(file.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`p-4 rounded-xl ${
                  darkMode
                    ? "bg-blue-500/10 border border-blue-500/20"
                    : "bg-blue-50/50 border border-blue-200"
                }`}
              >
                <div className="flex items-start space-x-3">
                  <Clock
                    className={`h-5 w-5 mt-0.5 ${darkMode ? "text-blue-400" : "text-blue-500"}`}
                  />
                  <div>
                    <p
                      className={`text-sm font-medium ${darkMode ? "text-blue-300" : "text-blue-700"}`}
                    >
                      Processing takes 2-10 minutes
                    </p>
                    <p
                      className={`text-xs mt-1 ${darkMode ? "text-blue-400/80" : "text-blue-600/80"}`}
                    >
                      Your PDF will be converted to audio and sent to your email
                      when complete.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {isProcessing && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span
                        className={darkMode ? "text-gray-300" : "text-gray-700"}
                      >
                        {processingStatus}
                      </span>
                      <span className="font-semibold text-blue-500">
                        {uploadProgress}%
                      </span>
                    </div>
                    <div
                      className={`w-full h-2 rounded-full overflow-hidden ${
                        darkMode ? "bg-white/10" : "bg-gray-200"
                      }`}
                    >
                      <div
                        className="h-full bg-linear-to-r from-blue-500 to-purple-500 transition-all duration-300 ease-out"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    {uploadProgress > 0 &&
                      uploadProgress < 100 &&
                      estimatedTime && (
                        <p
                          className={`text-xs text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                        >
                          ⏱️ Estimated time remaining: {estimatedTime}
                        </p>
                      )}
                  </div>

                  {uploadProgress > 0 && (
                    <div
                      className={`p-3 rounded-lg text-center ${
                        darkMode ? "bg-white/5" : "bg-blue-50/50"
                      }`}
                    >
                      <p
                        className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}
                      >
                        Uploading your file ({uploadProgress}% complete)
                      </p>
                      <p
                        className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                      >
                        Please don't close this window
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Email Input (only show when not processing) */}
              {!isProcessing && (
                <div className="space-y-3">
                  <div>
                    <label
                      className={`block text-sm font-medium mb-2 ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}
                    >
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
                      <Mail
                        className={`absolute right-3 top-3 h-5 w-5 ${
                          darkMode ? "text-gray-400" : "text-gray-400"
                        } ${isProcessing ? "opacity-50" : ""}`}
                      />
                    </div>
                    {emailError && (
                      <p className="text-red-500 text-sm mt-2 flex items-center">
                        <X className="h-4 w-4 mr-1" /> {emailError}
                      </p>
                    )}
                  </div>

                  <div
                    className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                  >
                    <p>
                      We'll send the MP3 audio file to this email address once
                      conversion is complete.
                    </p>
                  </div>
                </div>
              )}

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
                      {processingStatus || "Processing..."}
                    </span>
                  ) : (
                    <span className="relative z-10 flex items-center justify-center">
                      <Send className="h-5 w-5 mr-2" />
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
          <div
            className={`relative z-10 w-full max-w-md rounded-3xl p-8 backdrop-blur-lg shadow-2xl border transition-all duration-300 animate-slide-up ${
              darkMode
                ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
                : "bg-linear-to-br from-white/90 to-white/70 border-white/30"
            }`}
          >
            <div className="flex flex-col items-center text-center space-y-6">
              {/* Success Icon */}
              <div
                className={`p-4 rounded-2xl ${
                  darkMode
                    ? "bg-emerald-500/20 border border-emerald-500/30"
                    : "bg-emerald-50 border border-emerald-200"
                }`}
              >
                <CheckCircle className="h-16 w-16 text-emerald-500 animate-scale-up" />
              </div>

              {/* Content */}
              <div className="space-y-4">
                <h2 className="text-2xl font-bold font-heading">
                  Processing Started!
                </h2>

                <div
                  className={`p-4 rounded-xl ${
                    darkMode
                      ? "bg-blue-500/10 border border-blue-500/20"
                      : "bg-blue-50/50 border border-blue-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Mail
                      className={`h-5 w-5 mt-0.5 shrink-0 ${darkMode ? "text-blue-400" : "text-blue-500"}`}
                    />
                    <div className="text-left">
                      <p
                        className={`text-sm font-medium ${darkMode ? "text-blue-300" : "text-blue-700"}`}
                      >
                        Your audio file will be emailed to you
                      </p>
                      <p
                        className={`text-sm mt-1 ${darkMode ? "text-blue-400/80" : "text-blue-600/80"}`}
                      >
                        We'll send the converted audio file to{" "}
                        <span className="font-semibold">{email}</span> once
                        processing is complete.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl ${
                    darkMode
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "bg-amber-50/50 border border-amber-200"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <Clock
                      className={`h-5 w-5 mt-0.5 shrink-0 ${darkMode ? "text-amber-400" : "text-amber-500"}`}
                    />
                    <div className="text-left">
                      <p
                        className={`text-sm font-medium ${darkMode ? "text-amber-300" : "text-amber-700"}`}
                      >
                        Processing Time
                      </p>
                      <p
                        className={`text-sm mt-1 ${darkMode ? "text-amber-400/80" : "text-amber-600/80"}`}
                      >
                        This usually takes 2-10 minutes depending on PDF size.
                        Larger files take longer.
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}
                >
                  <p>
                    Processing typically takes 2-10 minutes depending on file
                    size. You'll receive an email with the MP3 audio file
                    attached when your audio is ready.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setShowConfirmationModal(false)}
                className={`w-full py-3 rounded-xl font-medium transition-all duration-300 shadow-lg ${
                  darkMode
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                } text-white hover:shadow-emerald-500/25 hover:shadow-xl hover:-translate-y-0.5`}
              >
                Got it, thank you!
              </button>

              {/* Note */}
              <p
                className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
              >
                Check your spam folder if you don't see the email within 15
                minutes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="relative px-4 py-6 md:px-8 lg:px-16">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div
              className={`p-2 rounded-xl backdrop-blur-sm transition-all duration-300 ${
                darkMode
                  ? "bg-white/10 border border-white/20 hover:bg-white/20"
                  : "bg-white/80 border border-white/20 hover:bg-white"
              } shadow-lg hover:shadow-xl`}
            >
              <Music className="h-6 w-6 bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-purple-500" />
            </div>
            <div>
              <span className="text-2xl font-bold bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent font-display tracking-tight">
                SonifyReads
              </span>
              <p className="text-xs mt-1 opacity-75 font-sans font-light tracking-wide">
                PDF TO AUDIO CONVERTER
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
            <div
              className={`inline-flex items-center space-x-2 mb-6 px-5 py-2.5 rounded-full backdrop-blur-sm ${
                darkMode
                  ? "bg-white/10 border border-white/20"
                  : "bg-blue-400/20 border border-white/20"
              } shadow-lg animate-pulse`}
            >
              <Sparkles className="h-4 w-4 text-blue-500 animate-spin-slow" />
              <span className="font-medium bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-sans tracking-wide text-sm">
                PDF to Audio Conversion
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 max-w-5xl mx-auto animate-slide-up leading-tight font-display">
              <span className="bg-linear-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Convert PDFs
              </span>
              <br />
              <span className={darkMode ? "text-white" : "text-gray-900"}>
                Into{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-linear-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Audio Files
                  </span>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-linear-to-r from-blue-500 to-purple-500 rounded-full opacity-75"></div>
                </span>
              </span>
            </h1>

            <p
              className={`text-lg md:text-xl mb-10 max-w-3xl mx-auto animate-slide-up delay-100 leading-relaxed font-body ${
                darkMode ? "text-gray-300/90" : "text-gray-600/90"
              }`}
            >
              Upload your PDF and receive a professionally narrated audio file
              via email. Perfect for listening on the go.
            </p>

            <div className="flex flex-wrap justify-center gap-4 mb-8">
              <div
                className={`px-4 py-2 rounded-full backdrop-blur-sm ${
                  darkMode ? "bg-white/5" : "bg-white/50"
                }`}
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-500" />
                  Email Delivery
                </span>
              </div>
              <div
                className={`px-4 py-2 rounded-full backdrop-blur-sm ${
                  darkMode ? "bg-white/5" : "bg-white/50"
                }`}
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4 text-purple-500" />
                  Natural Voices
                </span>
              </div>
              <div
                className={`px-4 py-2 rounded-full backdrop-blur-sm ${
                  darkMode ? "bg-white/5" : "bg-white/50"
                }`}
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  Secure Processing
                </span>
              </div>
            </div>
          </section>

          {/* Main Conversion Section */}
          <section className="mb-20">
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Upload & Conversion Card */}
              <div
                className={`rounded-3xl p-8 backdrop-blur-lg shadow-2xl transition-all duration-300 hover:shadow-3xl border ${
                  darkMode
                    ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
                    : "bg-linear-to-br from-white/90 to-white/70 border-white/30"
                }`}
              >
                <div className="flex items-center space-x-3 mb-8">
                  <div>
                    <h2 className="text-2xl font-bold font-heading">
                      Convert Your PDF
                    </h2>
                    <p
                      className={`text-sm mt-1 ${
                        darkMode ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      Upload PDF and receive audio via email
                    </p>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="flex items-center justify-center w-full">
                    <label
                      className={`flex flex-col items-center justify-center w-full h-64 rounded-2xl cursor-pointer transition-all duration-300 group ${
                        darkMode
                          ? "border-2 border-dashed border-white/20 hover:border-blue-500/50 bg-white/5 hover:bg-white/10"
                          : "border-2 border-dashed border-gray-300 hover:border-blue-400 bg-white/50 hover:bg-blue-50/50"
                      } hover:scale-[1.02]`}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6 p-4">
                        {file ? (
                          <>
                            <div className="relative">
                              <FileAudio className="h-12 w-12 text-blue-500 mb-4 animate-bounce" />
                              <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-500 rounded-full animate-pulse"></div>
                            </div>
                            <p
                              className={`mb-2 text-lg font-semibold text-center font-sans ${
                                darkMode ? "text-gray-100" : "text-gray-700"
                              }`}
                            >
                              {file.name}
                            </p>
                            <p
                              className={`text-sm mb-4 font-medium ${
                                darkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              {(file.size / (1024 * 1024)).toFixed(2)} MB •
                              Ready to process
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
                            <Upload
                              className={`h-12 w-12 mb-4 transition-transform group-hover:scale-110 ${
                                darkMode ? "text-gray-400" : "text-gray-400"
                              }`}
                            />
                            <p
                              className={`mb-2 text-lg text-center font-heading ${
                                darkMode ? "text-gray-100" : "text-gray-700"
                              }`}
                            >
                              <span className="font-bold">
                                Drop your PDF here
                              </span>
                            </p>
                            <p
                              className={`text-sm text-center max-w-xs ${
                                darkMode ? "text-gray-400" : "text-gray-500"
                              }`}
                            >
                              Supports PDF files up to 50MB
                            </p>
                            <div
                              className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
                                darkMode ? "bg-white/10" : "bg-blue-500/10"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                <Shield className="h-3 w-3" />
                                Secure & private processing
                              </span>
                            </div>
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
                    <div
                      className={`mt-4 p-4 rounded-xl border backdrop-blur-sm animate-shake ${
                        darkMode
                          ? "bg-red-500/10 border-red-500/30"
                          : "bg-red-50 border-red-200"
                      }`}
                    >
                      <div className="flex items-center text-red-500">
                        <X className="h-5 w-5 mr-2 shrink-0" />
                        <span className="font-medium font-sans">{error}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
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
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Headphones className="h-6 w-6 mr-3 group-hover:scale-110 transition-transform" />
                          Convert to Audio
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </div>

              {/* Right Column - Steps & Features */}
              <div className="space-y-6">
                {/* Steps */}
                <div
                  className={`rounded-3xl p-6 backdrop-blur-lg shadow-xl border ${
                    darkMode
                      ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
                      : "bg-linear-to-br from-white/80 to-white/60 border-white/20"
                  }`}
                >
                  <h3 className="text-2xl font-bold mb-8 font-heading">
                    How It Works
                    <div className="h-1 w-16 bg-linear-to-r from-blue-500 to-purple-500 rounded-full mt-2"></div>
                  </h3>
                  <div className="space-y-6">
                    {steps.map((step, index) => (
                      <div
                        key={index}
                        className={`flex items-start space-x-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] group ${
                          darkMode ? "hover:bg-white/5" : "hover:bg-white/60"
                        } animate-slide-up`}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="shrink-0">
                          <div
                            className={`h-14 w-14 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform ${
                              darkMode
                                ? "bg-linear-to-br from-blue-500/20 to-purple-500/20 border border-white/10"
                                : "bg-linear-to-br from-blue-500/10 to-purple-500/10 border border-white/20"
                            }`}
                          >
                            <span className="font-bold text-2xl bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent font-display">
                              {step.number}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-lg font-heading">
                              {step.title}
                            </h4>
                            <div className="text-blue-500 group-hover:scale-125 transition-transform">
                              {step.icon}
                            </div>
                          </div>
                          <p
                            className={`leading-relaxed ${
                              darkMode ? "text-gray-400" : "text-gray-600"
                            } font-body`}
                          >
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Features */}
                <div
                  className={`rounded-3xl p-6 backdrop-blur-lg shadow-xl border ${
                    darkMode
                      ? "bg-linear-to-br from-white/5 to-white/2 border-white/10"
                      : "bg-linear-to-br from-white/80 to-white/60 border-white/20"
                  }`}
                >
                  <h3 className="text-xl font-bold mb-4 font-heading">
                    Key Features
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className={`p-3 rounded-lg text-center transition-all duration-300 hover:scale-105 ${
                        darkMode ? "bg-white/5" : "bg-white/50"
                      }`}
                    >
                      <div className="text-2xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-1 font-display">
                        MP3
                      </div>
                      <div className="text-xs font-medium">Format</div>
                    </div>
                    <div
                      className={`p-3 rounded-lg text-center transition-all duration-300 hover:scale-105 ${
                        darkMode ? "bg-white/5" : "bg-white/50"
                      }`}
                    >
                      <div className="text-2xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-1 font-display">
                        50MB
                      </div>
                      <div className="text-xs font-medium">Max Size</div>
                    </div>
                    <div
                      className={`p-3 rounded-lg text-center transition-all duration-300 hover:scale-105 ${
                        darkMode ? "bg-white/5" : "bg-white/50"
                      }`}
                    >
                      <div className="text-2xl font-bold mb-1 font-display">
                        <Mail className="inline h-10 w-10 text-blue-500" />
                      </div>
                      <div className="text-xs font-medium">Email Delivery</div>
                    </div>
                    <div
                      className={`p-3 rounded-lg text-center transition-all duration-300 hover:scale-105 ${
                        darkMode ? "bg-white/5" : "bg-white/50"
                      }`}
                    >
                      <div className="text-2xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent mb-1 font-display">
                        24/7
                      </div>
                      <div className="text-xs font-medium">Processing</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative px-3 py-4 sm:py-6 md:px-8 lg:px-16 mt-6 md:mt-8 lg:mt-12">
        <div className="max-w-7xl mx-auto">
          <div
            className={`rounded-xl sm:rounded-2xl md:rounded-3xl p-3 sm:p-4 md:p-6 lg:p-8 backdrop-blur-lg border ${
              darkMode
                ? "bg-gray-800/50 border-gray-700"
                : "bg-white border-gray-200"
            } shadow-lg sm:shadow-xl`}
          >
            {/* Mobile Stack Layout */}
            <div className="flex flex-col space-y-4 sm:hidden">
              {/* Top Row - Logo & Copyright */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      darkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <Music className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                      SonifyReads
                    </span>
                    <p
                      className={`text-xs mt-0.5 font-light ${
                        darkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                    >
                      PDF Converter
                    </p>
                  </div>
                </div>
                <div
                  className={`text-right ${darkMode ? "text-gray-400" : "text-gray-600"}`}
                >
                  <p className="text-xs font-medium">
                    © {new Date().getFullYear()}
                  </p>
                </div>
              </div>

              {/* Middle Row - GitHub Link */}
              <div className="flex flex-col items-center space-y-2">
                <p
                  className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}
                >
                  Made with <span className="text-red-500">❤️</span> by
                </p>
                <a
                  href="https://github.com/imHardik1606"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                    darkMode
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900"
                  } shadow-sm hover:shadow-md`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm font-medium">Hardik</span>
                </a>
              </div>

              {/* Bottom Row - Full Copyright */}
              <div
                className={`text-center ${darkMode ? "text-gray-400" : "text-gray-600"}`}
              >
                <p className="text-xs font-light">All rights reserved</p>
              </div>
            </div>

            {/* Desktop Horizontal Layout */}
            <div className="hidden sm:flex flex-row justify-between items-center">
              {/* Left Side - Logo/Brand */}
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    darkMode ? "bg-gray-700" : "bg-gray-100"
                  }`}
                >
                  <Music className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-lg md:text-xl font-bold bg-linear-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                    SonifyReads
                  </span>
                  <p
                    className={`text-sm md:text-sm mt-0.5 font-light tracking-wider ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    PDF to Audio Converter
                  </p>
                </div>
              </div>

              {/* Middle Part - GitHub link */}
              <div className="flex flex-col items-center">
                <div className="flex items-center space-x-2">
                  <p
                    className={`text-sm md:text-sm font-medium ${
                      darkMode ? "text-gray-400" : "text-gray-500"
                    } whitespace-nowrap`}
                  >
                    Made with <span className="text-red-500">❤️</span> by
                  </p>
                  <a
                    href="https://github.com/imHardik1606"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center space-x-2 px-3 md:px-4 py-2 rounded-lg transition-all duration-300 hover:scale-105 ${
                      darkMode
                        ? "bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900"
                    } shadow-sm hover:shadow-md`}
                  >
                    <svg
                      className="h-4.5 w-4.5 md:h-5 md:w-5"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-base md:text-lg font-medium">
                      Hardik
                    </span>
                  </a>
                </div>
              </div>

              {/* Right Side - Copyright */}
              <div
                className={`text-right ${
                  darkMode ? "text-gray-400" : "text-gray-600"
                }`}
              >
                <p className="text-sm md:text-base font-medium leading-tight">
                  © {new Date().getFullYear()} SonifyReads
                </p>
                <p className="text-xs md:text-sm mt-0.5 font-light leading-tight">
                  All rights reserved
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Custom CSS */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
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
          0%,
          100% {
            transform: translateX(0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translateX(-5px);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translateX(5px);
          }
        }

        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
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
          animation: scale-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
}
