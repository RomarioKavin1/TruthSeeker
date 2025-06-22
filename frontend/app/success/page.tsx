"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SuccessPage() {
  const [proofData, setProofData] = useState<{
    zkPassport?: { verified: boolean; nullifier: string; timestamp: string };
    walletAddress?: string;
    walletSignature?: string;
    hyliIdentity?: { verified: boolean; did: string; credentials: string[] };
    tier: string;
    timestamp: string;
  } | null>(null);
  const [videoCid, setVideoCid] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  const searchParams = useSearchParams();
  const tier = searchParams.get("tier") || "anonymity";

  useEffect(() => {
    // Load proof data from session storage
    const storedProof = sessionStorage.getItem("final_proof");
    const storedCid = sessionStorage.getItem("video_cid");

    if (storedProof) {
      setProofData(JSON.parse(storedProof));
    }
    if (storedCid) {
      setVideoCid(storedCid);
    }

    setIsLoading(false);
  }, []);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "TruthSeeker Verified Content",
          text: `I've created verified content using TruthSeeker's ${tier.toUpperCase()} tier!`,
          url: `https://ipfs.io/ipfs/${videoCid}`,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`https://ipfs.io/ipfs/${videoCid}`);
      alert("Link copied to clipboard!");
    }
  };

  const handleDownload = () => {
    const recordedVideo = sessionStorage.getItem("recorded_video");
    if (recordedVideo) {
      const link = document.createElement("a");
      link.href = recordedVideo;
      link.download = `truthseeker-${tier}-${Date.now()}.webm`;
      link.click();
    }
  };

  const getTierIcon = () => {
    switch (tier) {
      case "anonymity":
        return "🔒";
      case "pseudoAnon":
        return "🕶️";
      case "identity":
        return "🪪";
      default:
        return "✅";
    }
  };

  const getTierDescription = () => {
    switch (tier) {
      case "anonymity":
        return "Your content has been verified with anonymous proof of humanity. Maximum privacy protection while proving authenticity.";
      case "pseudoAnon":
        return "Your content has been verified with wallet-linked proof. Enhanced authenticity with traceable verification.";
      case "identity":
        return "Your content has been verified with full identity credentials. Maximum verifiability with complete audit trail.";
      default:
        return "Your content has been successfully verified.";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 font-mono flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <div className="font-bold">LOADING...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-mono">
      {/* Header */}
      <header className="border-b-4 border-black bg-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold uppercase tracking-wider">
            TRUTHSEEKER
          </div>
          <div className="text-sm font-bold uppercase tracking-wide border-2 border-black px-3 py-1">
            VERIFICATION COMPLETE
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Success Header */}
          <div className="text-center mb-12">
            <div className="text-8xl mb-6">{getTierIcon()}</div>
            <h1 className="text-4xl font-bold uppercase tracking-tight mb-4 text-green-600">
              VERIFICATION SUCCESSFUL
            </h1>
            <p className="text-xl font-mono text-gray-700">
              {tier.toUpperCase()} TIER ACTIVATED
            </p>
          </div>

          {/* Main Content */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            {/* Left Side - Proof Details */}
            <div className="border-4 border-black bg-white p-8">
              <h2 className="font-bold uppercase text-xl mb-6 border-b-2 border-black pb-2">
                PROOF DETAILS
              </h2>

              <div className="space-y-4 font-mono text-sm">
                <div>
                  <span className="font-bold">TIER:</span> {tier.toUpperCase()}
                </div>
                <div>
                  <span className="font-bold">TIMESTAMP:</span>{" "}
                  {proofData?.timestamp
                    ? new Date(proofData.timestamp).toLocaleString()
                    : "N/A"}
                </div>
                <div>
                  <span className="font-bold">IPFS CID:</span>
                  <div className="break-all text-blue-600">{videoCid}</div>
                </div>

                {proofData?.zkPassport && (
                  <div>
                    <span className="font-bold">ZKPASSPORT:</span> ✅ VERIFIED
                  </div>
                )}

                {proofData?.walletAddress && (
                  <div>
                    <span className="font-bold">WALLET:</span>
                    <div className="break-all text-blue-600">
                      {proofData.walletAddress}
                    </div>
                  </div>
                )}

                {proofData?.hyliIdentity && (
                  <div>
                    <span className="font-bold">IDENTITY:</span> ✅ VERIFIED
                    <div className="text-xs text-gray-600 mt-1">
                      DID: {proofData.hyliIdentity.did}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Side - Description */}
            <div className="border-4 border-black bg-black text-white p-8">
              <h2 className="font-bold uppercase text-xl mb-6">
                WHAT THIS MEANS
              </h2>

              <div className="space-y-4 font-mono text-sm">
                <p>{getTierDescription()}</p>

                <div className="space-y-2">
                  <div className="font-bold">VERIFICATION INCLUDES:</div>
                  {tier === "anonymity" && (
                    <ul className="space-y-1 ml-4">
                      <li>• Zero-knowledge proof of humanity</li>
                      <li>• Steganographic proof embedding</li>
                      <li>• Anonymous IPFS storage</li>
                    </ul>
                  )}
                  {tier === "pseudoAnon" && (
                    <ul className="space-y-1 ml-4">
                      <li>• Zero-knowledge proof of humanity</li>
                      <li>• Wallet signature verification</li>
                      <li>• Address-linked authenticity</li>
                      <li>• Enhanced proof embedding</li>
                    </ul>
                  )}
                  {tier === "identity" && (
                    <ul className="space-y-1 ml-4">
                      <li>• Zero-knowledge proof of humanity</li>
                      <li>• Wallet signature verification</li>
                      <li>• Full identity credentials</li>
                      <li>• Complete audit trail</li>
                      <li>• Government-grade authentication</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <Button
              onClick={handleShare}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase border-4 border-black"
            >
              📤 SHARE CONTENT
            </Button>

            <Button
              onClick={handleDownload}
              className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white font-bold uppercase border-4 border-black"
            >
              💾 DOWNLOAD VIDEO
            </Button>

            <Button
              onClick={() =>
                window.open(`https://ipfs.io/ipfs/${videoCid}`, "_blank")
              }
              className="px-6 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase border-4 border-black"
            >
              🌐 VIEW ON IPFS
            </Button>
          </div>

          {/* Navigation */}
          <div className="text-center space-y-4">
            <Link href="/tier-selection">
              <Button className="px-8 py-4 bg-black text-white font-bold uppercase border-4 border-black hover:bg-gray-800 mr-4">
                🔄 CREATE ANOTHER
              </Button>
            </Link>

            <Link href="/">
              <Button className="px-8 py-4 bg-white text-black font-bold uppercase border-4 border-black hover:bg-gray-100">
                🏠 BACK TO HOME
              </Button>
            </Link>
          </div>

          {/* Technical Info */}
          <div className="mt-12 border-4 border-black bg-gray-50 p-6">
            <h3 className="font-bold uppercase text-lg mb-4">
              TECHNICAL VERIFICATION
            </h3>
            <div className="font-mono text-xs space-y-2 text-gray-700">
              <p>
                This content has been cryptographically verified and stored on
                IPFS.
              </p>
              <p>
                The embedded proofs can be independently verified using
                TruthSeeker&apos;s verification tools.
              </p>
              <p>Timestamp: {proofData?.timestamp}</p>
              <p>Content Hash: {videoCid}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
