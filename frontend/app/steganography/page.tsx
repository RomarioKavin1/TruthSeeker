"use client";

import { useState, useRef } from "react";
import { useWallet } from "../components/ClientWalletProvider";
import Link from "next/link";

export default function SteganographyPage() {
  const { wallet } = useWallet();
  const [activeTab, setActiveTab] = useState<"hide" | "extract">("hide");
  const [mediaType, setMediaType] = useState<"image" | "video">("image");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [secretText, setSecretText] = useState("");
  const [encryptData, setEncryptData] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setResult(null);
    setExtractedText(null);
    setDownloadUrl(null);
    setError(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      resetState();
    }
  };

  const validateFile = (file: File): boolean => {
    if (mediaType === "image") {
      const allowedTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/bmp",
      ];
      if (!allowedTypes.includes(file.type)) {
        setError("Please select a valid image file (JPEG, PNG, BMP)");
        return false;
      }
    } else {
      const allowedTypes = ["video/mp4", "video/mov", "video/avi", "video/mkv"];
      if (!allowedTypes.includes(file.type)) {
        setError("Please select a valid video file (MP4, MOV, AVI, MKV)");
        return false;
      }
      // Check file size (100MB limit)
      if (file.size > 100 * 1024 * 1024) {
        setError("Video file too large. Please use a file smaller than 100MB.");
        return false;
      }
    }
    return true;
  };

  const hideData = async () => {
    if (!selectedFile || !secretText.trim()) {
      setError("Please select a file and enter secret text");
      return;
    }

    if (!validateFile(selectedFile)) {
      return;
    }

    setLoading(true);
    setError(null);
    resetState();

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("text", secretText);
      formData.append("encrypt", encryptData.toString());

      const endpoint = mediaType === "image" ? "/encrypt" : "/encrypt";
      const steganographyUrl =
        process.env.NEXT_PUBLIC_STEGANOGRAPHY_URL || "http://localhost:5001";

      const response = await fetch(`${steganographyUrl}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      if (mediaType === "image") {
        // For images, we get the processed image back
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setResult(
          "Data hidden successfully! Click download to get the processed image."
        );
      } else {
        // For videos, we get a JSON response with download info
        const data = await response.json();
        if (data.download_url) {
          setDownloadUrl(`${steganographyUrl}${data.download_url}`);
          setResult(
            "Data hidden successfully! Click download to get the processed video."
          );
        } else {
          setResult("Data hidden successfully!");
        }
      }
    } catch (error) {
      console.error("Error hiding data:", error);
      setError(error instanceof Error ? error.message : "Failed to hide data");
    } finally {
      setLoading(false);
    }
  };

  const extractData = async () => {
    if (!selectedFile) {
      setError("Please select a file");
      return;
    }

    if (!validateFile(selectedFile)) {
      return;
    }

    setLoading(true);
    setError(null);
    resetState();

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const endpoint = "/decrypt";
      const steganographyUrl =
        process.env.NEXT_PUBLIC_STEGANOGRAPHY_URL || "http://localhost:5001";

      const response = await fetch(`${steganographyUrl}${endpoint}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      if (data.extracted_text) {
        setExtractedText(data.extracted_text);
        setResult("Data extracted successfully!");
      } else {
        setError("No hidden data found in the file");
      }
    } catch (error) {
      console.error("Error extracting data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to extract data"
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    if (downloadUrl) {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `truthseeker_${mediaType}_${Date.now()}.${
        mediaType === "image" ? "png" : "mp4"
      }`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Wallet Required
          </h2>
          <p className="text-gray-600 mb-4">
            Please connect your Hyli wallet to access steganography features
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link
                href="/"
                className="text-2xl font-bold text-gray-900 hover:text-green-600 transition-colors"
              >
                TruthSeeker
              </Link>
              <span className="text-gray-400">|</span>
              <h2 className="text-lg font-semibold text-gray-700">
                Steganography
              </h2>
            </div>
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
              </div>
              <Link
                href="/dashboard"
                className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Title Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            <span className="bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent">
              Steganography Studio
            </span>
          </h1>
          <p className="text-lg text-gray-600">
            Hide and extract secret data in images and videos
          </p>
        </div>

        {/* Main Interface */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
              <button
                onClick={() => {
                  setActiveTab("hide");
                  resetState();
                }}
                className={`flex-1 px-6 py-3 rounded-md font-semibold transition-all ${
                  activeTab === "hide"
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🔒 Hide Data
              </button>
              <button
                onClick={() => {
                  setActiveTab("extract");
                  resetState();
                }}
                className={`flex-1 px-6 py-3 rounded-md font-semibold transition-all ${
                  activeTab === "extract"
                    ? "bg-white text-green-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                🔍 Extract Data
              </button>
            </div>

            {/* Media Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Media Type
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setMediaType("image");
                    setSelectedFile(null);
                    resetState();
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    mediaType === "image"
                      ? "bg-green-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🖼️ Image
                </button>
                <button
                  onClick={() => {
                    setMediaType("video");
                    setSelectedFile(null);
                    resetState();
                  }}
                  className={`px-6 py-3 rounded-lg font-medium transition-all ${
                    mediaType === "video"
                      ? "bg-green-500 text-white shadow-lg"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  🎥 Video
                </button>
              </div>
            </div>

            {/* File Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select {mediaType === "image" ? "Image" : "Video"} File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  accept={mediaType === "image" ? "image/*" : "video/*"}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                >
                  📁 Choose File
                </button>
                {selectedFile && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p className="font-medium">{selectedFile.name}</p>
                    <p>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                )}
              </div>
            </div>

            {/* Hide Data Form */}
            {activeTab === "hide" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Secret Text to Hide
                  </label>
                  <textarea
                    value={secretText}
                    onChange={(e) => setSecretText(e.target.value)}
                    placeholder="Enter the secret message you want to hide..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="encrypt"
                    checked={encryptData}
                    onChange={(e) => setEncryptData(e.target.checked)}
                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label
                    htmlFor="encrypt"
                    className="text-sm font-medium text-gray-700"
                  >
                    🔐 Encrypt data with RSA (recommended)
                  </label>
                </div>

                <button
                  onClick={hideData}
                  disabled={loading || !selectedFile || !secretText.trim()}
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl hover:from-green-600 hover:to-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Hiding Data...</span>
                    </div>
                  ) : (
                    "🔒 Hide Secret Data"
                  )}
                </button>
              </div>
            )}

            {/* Extract Data Form */}
            {activeTab === "extract" && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    📋 Instructions
                  </h4>
                  <p className="text-sm text-blue-800">
                    Select a {mediaType} file that contains hidden data. The
                    system will automatically decrypt the data if it was
                    encrypted with RSA.
                  </p>
                </div>

                <button
                  onClick={extractData}
                  disabled={loading || !selectedFile}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Extracting Data...</span>
                    </div>
                  ) : (
                    "🔍 Extract Hidden Data"
                  )}
                </button>
              </div>
            )}

            {/* Results */}
            {(result || error || extractedText || downloadUrl) && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">
                  Results
                </h4>

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800 font-medium">Error:</p>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                )}

                {result && (
                  <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800 font-medium">
                      Success:
                    </p>
                    <p className="text-sm text-green-700 mt-1">{result}</p>
                  </div>
                )}

                {extractedText && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium mb-2">
                      Extracted Secret Text:
                    </p>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {extractedText}
                      </p>
                    </div>
                  </div>
                )}

                {downloadUrl && (
                  <button
                    onClick={downloadFile}
                    className="inline-flex items-center px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
                  >
                    💾 Download Processed File
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Features Info */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
              Steganography Features
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-green-600 text-xl">🖼️</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Image Support
                </h4>
                <p className="text-sm text-gray-600">
                  JPEG, PNG, BMP formats supported
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-blue-600 text-xl">🎥</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Video Support
                </h4>
                <p className="text-sm text-gray-600">
                  MP4, MOV, AVI, MKV formats
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-purple-600 text-xl">🔐</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  RSA Encryption
                </h4>
                <p className="text-sm text-gray-600">
                  Secure data with RSA encryption
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                  <span className="text-orange-600 text-xl">⚡</span>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Fast Processing
                </h4>
                <p className="text-sm text-gray-600">
                  Optimized algorithms for speed
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
