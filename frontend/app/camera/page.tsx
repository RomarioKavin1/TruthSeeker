"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import CameraAnimation from "@/components/CameraAnimation";

export default function CameraPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [processingStage, setProcessingStage] = useState("");
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [videoMimeType, setVideoMimeType] = useState<string>("video/webm");
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const tier = searchParams.get("tier") || "anonymity";

  const tierLabels = {
    anonymity: "ANONYMITY MODE",
    pseudoAnon: "PSEUDO-ANON MODE",
    identity: "IDENTITY MODE",
  };

  const tierFeatures = {
    anonymity: [
      "ZKPassport Proof of Humanity",
      "Nullifier Hash Generation",
      "Steganographic Embedding",
      "Anonymous Storage",
    ],
    pseudoAnon: [
      "ZKPassport + Hyli Wallet Linking",
      "Address-Based Verification",
      "Enhanced Proof Embedding",
      "Traceable Authenticity",
    ],
    identity: [
      "Hyli Protocol Identity Verification",
      "Full Identity Proof Embedding",
      "Government-Grade Authentication",
      "Complete Audit Trail",
    ],
  };

  const tierUseCases = {
    anonymity:
      "Perfect for whistleblowers recording inside sensitive locations while proving humanity without revealing identity",
    pseudoAnon:
      "Ideal for content creators who want verifiable authenticity while maintaining some privacy protection",
    identity:
      "Essential for official announcements, government employees, or public figures requiring full identity verification",
  };

  // Camera initialization and cleanup
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    const initializeCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 1920,
            height: 1080,
            frameRate: 30,
          },
          audio: true,
        });

        currentStream = mediaStream;
        setStream(mediaStream);
        setIsInitialized(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
      }
    };

    initializeCamera();

    // Cleanup function - CRITICAL for stopping camera
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
      if (stream) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  // Additional cleanup on route change
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const startRecording = () => {
    if (!stream) return;

    setIsRecording(true);
    setRecordingTime(0);
    setProcessingStage("");
    setRecordedChunks([]); // Reset chunks

    // Try to use MP4 if supported
    let mimeType = "";
    if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      mimeType = "video/webm";
    }

    console.log("Using MIME type:", mimeType);
    setVideoMimeType(mimeType || "video/webm");

    const bitrate = 1500000; // 1.5 Mbps

    const options = mimeType
      ? { mimeType, videoBitsPerSecond: bitrate }
      : undefined;

    try {
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          setRecordedChunks((prev) => [...prev, event.data]);
        }
      };

      mediaRecorder.onstop = () => {
        setProcessingStage("PROCESSING VIDEO...");
      };

      mediaRecorder.start(100);
    } catch (error) {
      console.error("Error starting MediaRecorder:", error);
      setProcessingStage("Failed to start recording. Try a different browser.");
    }
  };

  const stopRecording = () => {
    setIsRecording(false);

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  // Handle video processing after recording stops
  useEffect(() => {
    if (
      recordedChunks.length > 0 &&
      !isRecording &&
      processingStage === "PROCESSING VIDEO..."
    ) {
      const processVideo = async () => {
        const videoBlob = new Blob(recordedChunks, { type: videoMimeType });

        // Convert to base64 for storage
        const reader = new FileReader();
        reader.onloadend = () => {
          sessionStorage.setItem("recorded_video", reader.result as string);
          sessionStorage.setItem("video_tier", tier);
          sessionStorage.setItem("video_mime_type", videoMimeType);

          // Stop camera before navigation
          if (stream) {
            stream.getTracks().forEach((track) => track.stop());
          }

          router.push(`/proof-process?tier=${tier}`);
        };
        reader.readAsDataURL(videoBlob);
      };

      setTimeout(processVideo, 500);
    }
  }, [
    recordedChunks,
    isRecording,
    processingStage,
    videoMimeType,
    tier,
    stream,
    router,
  ]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-black font-mono text-white relative overflow-hidden">
      {/* Background Animation */}
      <CameraAnimation />

      {/* Header */}
      <header className="border-b-4 border-white bg-black p-4 relative z-10">
        <div className="container mx-auto flex items-center justify-between">
          <Link
            href="/tier-selection"
            className="text-xl font-bold uppercase tracking-wider text-white hover:bg-white hover:text-black px-2 py-1 transition-colors"
          >
            ← TRUTHSEEKER
          </Link>
          <div className="text-sm font-bold uppercase tracking-wide border-2 border-white px-3 py-1">
            {tierLabels[tier as keyof typeof tierLabels]}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Left Side - Camera */}
          <div className="space-y-6">
            <div className="border-4 border-white bg-black">
              <div className="p-4 border-b-4 border-white">
                <h2 className="font-bold uppercase text-lg">CAMERA FEED</h2>
              </div>
              <div className="relative aspect-video bg-gray-900">
                {isInitialized ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-4">📹</div>
                      <div className="font-mono">INITIALIZING CAMERA...</div>
                    </div>
                  </div>
                )}

                {/* Recording Indicator */}
                {isRecording && (
                  <div className="absolute top-4 left-4 flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="font-mono font-bold">REC</span>
                  </div>
                )}

                {/* Timer */}
                {isRecording && (
                  <div className="absolute top-4 right-4 font-mono font-bold text-xl">
                    {formatTime(recordingTime)}
                  </div>
                )}

                {/* Processing Overlay */}
                {processingStage && (
                  <div className="absolute inset-0 bg-black bg-opacity-80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl mb-4">⚙️</div>
                      <div className="font-mono">{processingStage}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex justify-center gap-4">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  disabled={!isInitialized}
                  className="px-8 py-4 bg-red-600 hover:bg-red-700 text-white font-bold uppercase border-4 border-white"
                >
                  🔴 START RECORDING
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  className="px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white font-bold uppercase border-4 border-white"
                >
                  ⏹️ STOP RECORDING
                </Button>
              )}
            </div>
          </div>

          {/* Right Side - Tier Info */}
          <div className="space-y-6">
            <div className="border-4 border-white bg-white text-black p-6">
              <h2 className="font-bold uppercase text-lg mb-4 border-b-2 border-black pb-2">
                {tierLabels[tier as keyof typeof tierLabels]}
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-bold uppercase mb-2">FEATURES:</h3>
                  <ul className="font-mono text-sm space-y-1">
                    {tierFeatures[tier as keyof typeof tierFeatures].map(
                      (feature, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span>✓</span>
                          <span>{feature}</span>
                        </li>
                      )
                    )}
                  </ul>
                </div>
                <div>
                  <h3 className="font-bold uppercase mb-2">USE CASE:</h3>
                  <p className="font-mono text-sm">
                    {tierUseCases[tier as keyof typeof tierUseCases]}
                  </p>
                </div>
              </div>
            </div>

            <div className="border-4 border-white bg-black text-white p-6">
              <h2 className="font-bold uppercase text-lg mb-4">
                RECORDING INSTRUCTIONS
              </h2>
              <div className="font-mono text-sm space-y-2">
                <p>1. ENSURE GOOD LIGHTING</p>
                <p>2. SPEAK CLEARLY INTO MICROPHONE</p>
                <p>3. KEEP CAMERA STEADY</p>
                <p>4. RECORD FOR AT LEAST 10 SECONDS</p>
                <p>5. CLICK STOP WHEN FINISHED</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
