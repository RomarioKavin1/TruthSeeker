"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  uploadProofToIPFS,
  isValidCID,
  getIPFSUrl,
  UploadResult,
} from "@/lib/pinata-service";

export default function PinataTestPage() {
  const [inputData, setInputData] = useState(
    '{\n  "test": "Hello IPFS!",\n  "timestamp": "' +
      new Date().toISOString() +
      '",\n  "app": "TruthSeeker Test"\n}'
  );
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleUpload = async () => {
    if (!inputData.trim()) {
      setError("Please enter some data to upload");
      return;
    }

    setIsUploading(true);
    setError("");
    setUploadResult(null);

    try {
      // Try to parse as JSON, if it fails treat as plain text
      let dataToUpload;
      try {
        dataToUpload = JSON.parse(inputData);
      } catch {
        dataToUpload = {
          content: inputData,
          type: "text",
          timestamp: new Date().toISOString(),
        };
      }

      const result = await uploadProofToIPFS(dataToUpload);
      setUploadResult(result);

      if (!result.success) {
        setError(result.error || "Upload failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsUploading(false);
    }
  };

  const loadSampleData = (type: string) => {
    const samples = {
      simple:
        '{\n  "message": "Hello IPFS!",\n  "timestamp": "' +
        new Date().toISOString() +
        '"\n}',
      proof:
        '{\n  "wallet_address": "0x1234...5678",\n  "proof": "zkp_data_here",\n  "verified": true,\n  "timestamp": "' +
        new Date().toISOString() +
        '",\n  "app": "TruthSeeker"\n}',
      text: "This is a simple text upload test for IPFS storage.",
      metadata:
        '{\n  "name": "Test File",\n  "description": "Testing Pinata upload",\n  "attributes": [\n    {"trait_type": "Type", "value": "Test"},\n    {"trait_type": "Timestamp", "value": "' +
        new Date().toISOString() +
        '"}\n  ]\n}',
    };
    setInputData(samples[type as keyof typeof samples] || samples.simple);
  };

  return (
    <div className="min-h-screen bg-white font-mono">
      {/* Header */}
      <header className="border-b-4 border-black bg-black text-white p-4">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold uppercase tracking-wider">
            🔗 PINATA IPFS TEST
          </h1>
          <p className="text-sm mt-2">Test IPFS uploads with Pinata</p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="grid gap-8">
          {/* Input Section */}
          <div className="border-4 border-black bg-white">
            <div className="p-4 border-b-4 border-black bg-gray-100">
              <h2 className="font-bold uppercase text-lg">📝 INPUT DATA</h2>
            </div>
            <div className="p-6 space-y-4">
              {/* Sample Data Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => loadSampleData("simple")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase border-2 border-black text-xs"
                >
                  Simple JSON
                </Button>
                <Button
                  onClick={() => loadSampleData("proof")}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-bold uppercase border-2 border-black text-xs"
                >
                  Proof Data
                </Button>
                <Button
                  onClick={() => loadSampleData("text")}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase border-2 border-black text-xs"
                >
                  Plain Text
                </Button>
                <Button
                  onClick={() => loadSampleData("metadata")}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase border-2 border-black text-xs"
                >
                  Metadata
                </Button>
              </div>

              {/* Text Area */}
              <textarea
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                placeholder="Enter JSON data or plain text to upload to IPFS..."
                className="w-full h-64 p-4 border-2 border-gray-300 font-mono text-sm resize-none focus:border-blue-500 focus:outline-none"
              />

              {/* Upload Button */}
              <div className="flex justify-center">
                <Button
                  onClick={handleUpload}
                  disabled={isUploading || !inputData.trim()}
                  className="px-8 py-4 bg-black hover:bg-gray-800 text-white font-bold uppercase border-4 border-black disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? "⏳ UPLOADING..." : "🚀 UPLOAD TO IPFS"}
                </Button>
              </div>
            </div>
          </div>

          {/* Results Section */}
          {(uploadResult || error) && (
            <div className="border-4 border-black bg-white">
              <div className="p-4 border-b-4 border-black bg-gray-100">
                <h2 className="font-bold uppercase text-lg">📊 RESULTS</h2>
              </div>
              <div className="p-6 space-y-4">
                {error && (
                  <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 font-mono text-sm">
                    <div className="font-bold">❌ ERROR</div>
                    <div>{error}</div>
                  </div>
                )}

                {uploadResult?.success && (
                  <div className="bg-green-100 border-2 border-green-500 text-green-700 p-4 font-mono text-sm space-y-3">
                    <div className="font-bold">✅ UPLOAD SUCCESSFUL</div>

                    <div className="bg-white p-3 rounded border text-xs space-y-2">
                      <div>
                        <strong>CID:</strong>{" "}
                        <span className="font-mono bg-green-100 px-1 rounded break-all">
                          {uploadResult.cid}
                        </span>
                      </div>

                      <div>
                        <strong>Size:</strong> {uploadResult.size} bytes
                      </div>

                      <div>
                        <strong>Valid CID:</strong>{" "}
                        {uploadResult.cid && isValidCID(uploadResult.cid)
                          ? "✅ Yes"
                          : "❌ No"}
                      </div>

                      {uploadResult.gatewayUrl && (
                        <div>
                          <strong>IPFS Link:</strong>{" "}
                          <a
                            href={uploadResult.gatewayUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline break-all"
                          >
                            {uploadResult.gatewayUrl} ↗
                          </a>
                        </div>
                      )}

                      {uploadResult.cid && (
                        <div>
                          <strong>Alternative Gateways:</strong>
                          <div className="ml-4 text-xs space-y-1">
                            <div>
                              <a
                                href={`https://gateway.pinata.cloud/ipfs/${uploadResult.cid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline break-all"
                              >
                                Pinata Gateway ↗
                              </a>
                            </div>
                            <div>
                              <a
                                href={`https://ipfs.io/ipfs/${uploadResult.cid}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline break-all"
                              >
                                IPFS.io Gateway ↗
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-green-600 font-bold">
                      🌐 Data successfully stored on IPFS network
                    </div>
                  </div>
                )}

                {uploadResult && !uploadResult.success && (
                  <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 font-mono text-sm">
                    <div className="font-bold">❌ UPLOAD FAILED</div>
                    <div>{uploadResult.error}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Configuration Info */}
          <div className="border-4 border-black bg-yellow-50">
            <div className="p-4 border-b-4 border-black bg-yellow-100">
              <h2 className="font-bold uppercase text-lg">⚙️ CONFIGURATION</h2>
            </div>
            <div className="p-6 space-y-3 text-sm">
              <div>
                <strong>Pinata JWT:</strong>{" "}
                {process.env.NEXT_PUBLIC_PINATA_JWT ? (
                  <span className="text-green-600 font-bold">
                    ✅ Configured
                  </span>
                ) : (
                  <span className="text-red-600 font-bold">❌ Not Set</span>
                )}
              </div>
              <div>
                <strong>Gateway URL:</strong>{" "}
                {process.env.NEXT_PUBLIC_GATEWAY_URL ||
                  "https://gateway.pinata.cloud (default)"}
              </div>
              {!process.env.NEXT_PUBLIC_PINATA_JWT && (
                <div className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-3 font-mono text-xs">
                  <div className="font-bold">📝 Setup Instructions:</div>
                  <div className="mt-2">
                    1. Create .env.local file in frontend directory
                    <br />
                    2. Add: NEXT_PUBLIC_PINATA_JWT=your_jwt_token
                    <br />
                    3. Add: NEXT_PUBLIC_GATEWAY_URL=your_gateway_url
                    <br />
                    4. Restart the development server
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
