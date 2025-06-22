"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { backendService } from "@/lib/backend-service";
import BackendStatus from "@/components/BackendStatus";

export default function SandboxPage() {
  // Tab management
  const [activeTab, setActiveTab] = useState<"record" | "verify">("record");

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
    null
  );
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [customText, setCustomText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedVideo, setProcessedVideo] = useState<string | null>(null);
  const [processedFilename, setProcessedFilename] = useState<string>("");
  const [isCameraLoading, setIsCameraLoading] = useState(false);

  // Verification states
  const [verifyFile, setVerifyFile] = useState<File | null>(null);
  const [verifyVideoUrl, setVerifyVideoUrl] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    border_data?: string;
    stego_data?: string;
  } | null>(null);
  const [verifyError, setVerifyError] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const verifyVideoRef = useRef<HTMLVideoElement>(null);

  // Cleanup function
  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setMediaRecorder(null);
  };

  useEffect(() => {
    return cleanup;
  }, []);

  // Handle stream setup when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log("Stream available, setting up video element...");
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((time) => time + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startCamera = async () => {
    setIsCameraLoading(true);
    try {
      console.log("Requesting camera access...");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      console.log("Camera access granted, setting stream...");
      setStream(mediaStream);
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert(
        "Failed to access camera. Please check permissions and make sure you're using HTTPS."
      );
      setStream(null);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    cleanup();
    setIsCameraLoading(false);
  };

  const startRecording = async () => {
    if (!stream) return;

    try {
      // Determine the best MIME type
      let mimeType = "video/mp4";
      if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeType = "video/mp4";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/webm")) {
        mimeType = "video/webm";
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        videoBitsPerSecond: 1500000,
      });

      const recordedChunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(recordedChunks, { type: mimeType });

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === "string") {
            setRecordedVideo(reader.result);
            sessionStorage.setItem("sandboxRecordedVideo", reader.result);

            // Stop camera after recording is complete
            cleanup();
          }
        };
        reader.readAsDataURL(recordedBlob);
      };

      recorder.start(100); // Collect data every 100ms
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const processVideo = async () => {
    if (!recordedVideo || !customText.trim()) {
      alert("Please record a video and enter text to embed");
      return;
    }

    setIsProcessing(true);
    try {
      // Convert base64 to blob
      const base64Response = await fetch(recordedVideo);
      const videoBlob = await base64Response.blob();

      // Create File object from blob
      const videoFile = new File([videoBlob], "recorded_video.mp4", {
        type: "video/mp4",
      });

      // Call backend to encrypt
      const result = await backendService.encryptVideo(videoFile, customText);

      if (result.mp4) {
        // Convert base64 back to blob URL for download
        const processedBlob = new Blob(
          [Uint8Array.from(atob(result.mp4), (c) => c.charCodeAt(0))],
          { type: "video/mp4" }
        );

        const processedUrl = URL.createObjectURL(processedBlob);
        setProcessedVideo(processedUrl);
        setProcessedFilename(result.mp4_filename || "encrypted_video.mp4");

        // Store for verification
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result && typeof reader.result === "string") {
            sessionStorage.setItem("sandboxProcessedVideo", reader.result);
          }
        };
        reader.readAsDataURL(processedBlob);
      }
    } catch (error) {
      console.error("Error processing video:", error);
      alert("Failed to process video. Make sure the backend is running.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadVideo = () => {
    if (!processedVideo) return;

    const link = document.createElement("a");
    link.href = processedVideo;
    link.download = processedFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetRecording = () => {
    setRecordedVideo(null);
    setProcessedVideo(null);
    setCustomText("");
    sessionStorage.removeItem("sandboxRecordedVideo");
    sessionStorage.removeItem("sandboxProcessedVideo");
    if (processedVideo) {
      URL.revokeObjectURL(processedVideo);
    }
  };

  // Verification functions
  const handleVerifyDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const videoFile = files.find((file) => file.type.startsWith("video/"));
    if (videoFile) {
      setVerifyFile(videoFile);
      const url = URL.createObjectURL(videoFile);
      setVerifyVideoUrl(url);
    }
  };

  const handleVerifyFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith("video/")) {
      setVerifyFile(file);
      const url = URL.createObjectURL(file);
      setVerifyVideoUrl(url);
    }
  };

  const verifyVideo = async () => {
    if (!verifyFile) return;

    setIsVerifying(true);
    setVerificationResult(null);
    setVerifyError("");

    try {
      const result = await backendService.decryptVideo(verifyFile);
      setVerificationResult(result);
    } catch (error) {
      console.error("Verification error:", error);
      setVerifyError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setVerifyFile(null);
    setVerificationResult(null);
    setVerifyError("");
    if (verifyVideoUrl) {
      URL.revokeObjectURL(verifyVideoUrl);
      setVerifyVideoUrl(null);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-4 border-black bg-white p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold uppercase">
              🧪 STEGANOGRAPHY SANDBOX
            </h1>
            <p className="text-sm text-gray-600">
              Test video recording, text embedding, and verification
            </p>
          </div>
          <Link
            href="/"
            className="bg-black text-white px-4 py-2 border-4 border-black font-bold uppercase hover:bg-white hover:text-black transition-colors"
          >
            ← BACK TO HOME
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Backend Status */}
        <BackendStatus size="large" className="mb-6" />

        {/* Tab Navigation */}
        <div className="flex mb-6 border-4 border-black">
          <button
            onClick={() => setActiveTab("record")}
            className={`flex-1 py-3 px-6 font-bold uppercase border-r-4 border-black transition-colors ${
              activeTab === "record"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            📹 RECORD & EMBED
          </button>
          <button
            onClick={() => setActiveTab("verify")}
            className={`flex-1 py-3 px-6 font-bold uppercase transition-colors ${
              activeTab === "verify"
                ? "bg-black text-white"
                : "bg-white text-black hover:bg-gray-100"
            }`}
          >
            🔍 VERIFY & DECRYPT
          </button>
        </div>

        {/* Record Tab */}
        {activeTab === "record" && (
          <div className="space-y-6">
            {/* Camera Control */}
            <div className="border-4 border-black bg-white p-6">
              <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2">
                🎥 VIDEO RECORDING
              </h2>

              {!stream && !isCameraLoading ? (
                <div className="text-center py-8">
                  <Button
                    onClick={startCamera}
                    className="bg-green-600 text-white border-4 border-green-700 font-bold uppercase hover:bg-green-700 transition-colors"
                  >
                    START CAMERA
                  </Button>
                </div>
              ) : isCameraLoading ? (
                <div className="text-center py-8">
                  <div className="text-lg font-bold mb-4">
                    📹 STARTING CAMERA...
                  </div>
                  <div className="text-sm text-gray-600">
                    Please allow camera access when prompted
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Live Camera Feed */}
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      width="640"
                      height="480"
                      className="w-full max-w-2xl border-4 border-black bg-black"
                      onLoadedMetadata={() => {
                        console.log("Video metadata loaded");
                        if (videoRef.current) {
                          console.log(
                            "Video dimensions:",
                            videoRef.current.videoWidth,
                            "x",
                            videoRef.current.videoHeight
                          );
                        }
                      }}
                      onPlay={() => console.log("Video started playing")}
                      onError={(e) => console.error("Video error:", e)}
                    />
                    {isRecording && (
                      <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 font-bold text-sm">
                        ● REC {formatTime(recordingTime)}
                      </div>
                    )}
                  </div>

                  {/* Recording Controls */}
                  <div className="flex gap-4">
                    <Button
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`font-bold uppercase border-4 transition-colors ${
                        isRecording
                          ? "bg-red-600 text-white border-red-700 hover:bg-red-700"
                          : "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                      }`}
                    >
                      {isRecording ? "STOP RECORDING" : "START RECORDING"}
                    </Button>
                    <Button
                      onClick={stopCamera}
                      className="bg-gray-600 text-white border-4 border-gray-700 font-bold uppercase hover:bg-gray-700 transition-colors"
                    >
                      STOP CAMERA
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Text Input */}
            <div className="border-4 border-black bg-white p-6">
              <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2">
                ✏️ TEXT TO EMBED
              </h2>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Enter the text you want to embed in the video..."
                className="w-full h-32 p-4 border-4 border-gray-300 font-mono text-sm resize-none focus:border-black focus:outline-none"
              />
              <div className="text-xs text-gray-600 mt-2">
                Characters: {customText.length}
              </div>
            </div>

            {/* Recorded Video Preview */}
            {recordedVideo && (
              <div className="border-4 border-black bg-white p-6">
                <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2">
                  📹 RECORDED VIDEO
                </h2>
                <video
                  ref={recordedVideoRef}
                  src={recordedVideo}
                  controls
                  className="w-full max-w-2xl border-4 border-gray-300"
                />
              </div>
            )}

            {/* Process Controls */}
            {recordedVideo && (
              <div className="border-4 border-black bg-white p-6">
                <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2">
                  🔐 PROCESSING
                </h2>

                {!processedVideo ? (
                  <div className="space-y-4">
                    {isProcessing ? (
                      <div className="bg-black text-green-400 p-4 font-mono text-sm">
                        <div className="space-y-1">
                          <div>{"> PROCESSING VIDEO..."}</div>
                          <div>{"> ADDING BORDER STEGANOGRAPHY..."}</div>
                          <div>{"> ENCRYPTING TEXT WITH RSA..."}</div>
                          <div>{"> EMBEDDING WITH LSB STEGANOGRAPHY..."}</div>
                          <div className="animate-pulse text-yellow-400">
                            {"> PLEASE WAIT..."}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={processVideo}
                        disabled={!customText.trim()}
                        className="bg-purple-600 text-white border-4 border-purple-700 font-bold uppercase hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:border-gray-500"
                      >
                        EMBED TEXT & ENCRYPT
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 p-4 border-4 border-green-600">
                      <h3 className="font-bold text-green-800 mb-2">
                        ✅ VIDEO PROCESSED SUCCESSFULLY
                      </h3>
                      <p className="text-green-700 text-sm">
                        Your text has been embedded using steganography and the
                        video is ready for download.
                      </p>
                    </div>

                    {/* Encrypted Video Preview */}
                    <div className="border-4 border-green-600 bg-white p-4">
                      <h3 className="font-bold uppercase mb-3 text-green-800">
                        🔐 ENCRYPTED VIDEO PREVIEW
                      </h3>
                      <video
                        src={processedVideo}
                        controls
                        className="w-full max-w-2xl border-4 border-green-300"
                      />
                      <div className="mt-3 text-sm text-green-700">
                        <div>
                          <strong>Filename:</strong> {processedFilename}
                        </div>
                        <div>
                          <strong>Status:</strong> Text embedded with
                          steganography
                        </div>
                        <div>
                          <strong>Embedded Text:</strong> {customText}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        onClick={downloadVideo}
                        className="bg-green-600 text-white border-4 border-green-700 font-bold uppercase hover:bg-green-700 transition-colors"
                      >
                        📥 DOWNLOAD ENCRYPTED VIDEO
                      </Button>
                      <Button
                        onClick={resetRecording}
                        className="bg-gray-600 text-white border-4 border-gray-700 font-bold uppercase hover:bg-gray-700 transition-colors"
                      >
                        🔄 RESET
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Verify Tab */}
        {activeTab === "verify" && (
          <div className="space-y-6">
            {/* File Upload */}
            <div className="border-4 border-black bg-white p-6">
              <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2">
                📤 UPLOAD VIDEO TO VERIFY
              </h2>

              {!verifyFile ? (
                <div
                  onDrop={handleVerifyDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-4 border-dashed border-gray-400 p-12 text-center hover:border-black transition-colors cursor-pointer"
                >
                  <div className="text-4xl mb-4">📹</div>
                  <div className="text-lg font-bold mb-2">
                    DROP VIDEO FILE HERE
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    or click to browse
                  </div>
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVerifyFileInput}
                    className="hidden"
                    id="verifyFileInput"
                  />
                  <Button
                    onClick={() =>
                      document.getElementById("verifyFileInput")?.click()
                    }
                    className="bg-blue-600 text-white border-4 border-blue-700 font-bold uppercase hover:bg-blue-700 transition-colors"
                  >
                    SELECT VIDEO FILE
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="bg-gray-100 p-4 border-2 border-gray-300">
                    <div className="font-bold mb-2">SELECTED FILE:</div>
                    <div className="text-sm space-y-1">
                      <div>
                        <strong>Name:</strong> {verifyFile.name}
                      </div>
                      <div>
                        <strong>Size:</strong>{" "}
                        {(verifyFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                      <div>
                        <strong>Type:</strong> {verifyFile.type}
                      </div>
                    </div>
                  </div>

                  {/* Video Preview */}
                  {verifyVideoUrl && (
                    <video
                      ref={verifyVideoRef}
                      src={verifyVideoUrl}
                      controls
                      className="w-full max-w-2xl border-4 border-gray-300"
                    />
                  )}

                  {/* Verify Controls */}
                  <div className="flex gap-4">
                    <Button
                      onClick={verifyVideo}
                      disabled={isVerifying}
                      className="bg-purple-600 text-white border-4 border-purple-700 font-bold uppercase hover:bg-purple-700 transition-colors disabled:bg-gray-400"
                    >
                      {isVerifying ? "VERIFYING..." : "🔍 VERIFY & DECRYPT"}
                    </Button>
                    <Button
                      onClick={resetVerification}
                      className="bg-gray-600 text-white border-4 border-gray-700 font-bold uppercase hover:bg-gray-700 transition-colors"
                    >
                      🔄 SELECT DIFFERENT FILE
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Verification Progress */}
            {isVerifying && (
              <div className="border-4 border-black bg-white p-6">
                <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2">
                  🔍 VERIFICATION IN PROGRESS
                </h2>
                <div className="bg-black text-green-400 p-4 font-mono text-sm">
                  <div className="space-y-1">
                    <div>{"> ANALYZING VIDEO FRAMES..."}</div>
                    <div>{"> SCANNING FOR BORDER STEGANOGRAPHY..."}</div>
                    <div>{"> CHECKING LSB STEGANOGRAPHIC DATA..."}</div>
                    <div>{"> EXTRACTING EMBEDDED TEXT..."}</div>
                    <div className="animate-pulse text-yellow-400">
                      {"> PROCESSING..."}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Verification Results */}
            {verificationResult && (
              <div className="border-4 border-black bg-white p-6">
                <h2 className="font-bold uppercase mb-4 border-b-2 border-black pb-2">
                  📋 VERIFICATION RESULTS
                </h2>

                <div className="space-y-4">
                  {/* Status */}
                  <div
                    className={`border-4 p-4 font-bold text-center text-lg ${
                      verificationResult.border_data ||
                      verificationResult.stego_data
                        ? "border-green-600 bg-green-50 text-green-800"
                        : "border-red-600 bg-red-50 text-red-800"
                    }`}
                  >
                    {verificationResult.border_data ||
                    verificationResult.stego_data
                      ? "✅ TEXT EXTRACTED SUCCESSFULLY"
                      : "❌ NO EMBEDDED TEXT FOUND"}
                  </div>

                  {/* Border Data */}
                  {verificationResult.border_data && (
                    <div>
                      <div className="font-bold uppercase text-xs text-gray-600 mb-2">
                        📋 BORDER STEGANOGRAPHY DATA
                      </div>
                      <div className="bg-blue-50 p-4 border-2 border-blue-300 font-mono text-sm break-all">
                        {verificationResult.border_data}
                      </div>
                    </div>
                  )}

                  {/* LSB Data */}
                  {verificationResult.stego_data && (
                    <div>
                      <div className="font-bold uppercase text-xs text-gray-600 mb-2">
                        🔐 LSB STEGANOGRAPHY DATA (DECRYPTED)
                      </div>
                      <div className="bg-green-50 p-4 border-2 border-green-300 font-mono text-sm break-all">
                        {verificationResult.stego_data}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Verification Error */}
            {verifyError && (
              <div className="border-4 border-red-600 bg-red-50 p-6">
                <h2 className="font-bold uppercase mb-4 text-red-800">
                  ❌ VERIFICATION ERROR
                </h2>
                <p className="text-red-600 font-mono text-sm">{verifyError}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
