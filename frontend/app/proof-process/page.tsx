"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
interface ProofData {
  zkPassport?: {
    verified: boolean;
    nullifier: string;
    timestamp: string;
  };
  walletAddress?: string;
  walletSignature?: string;
  hyliIdentity?: {
    verified: boolean;
    did: string;
    credentials: string[];
  };
  tier: string;
  timestamp: string;
}

export default function ProofProcessPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const tier = searchParams.get("tier") || "anonymity";

  const tierSteps = {
    anonymity: [{ name: "ZKPASSPORT VERIFICATION", status: "pending" }],
    pseudoAnon: [
      { name: "ZKPASSPORT VERIFICATION", status: "pending" },
      { name: "HYLI WALLET CONNECTION", status: "pending" },
    ],
    identity: [
      { name: "ZKPASSPORT VERIFICATION", status: "pending" },
      { name: "HYLI WALLET CONNECTION", status: "pending" },
      { name: "HYLI IDENTITY VERIFICATION", status: "pending" },
    ],
  };

  const [steps, setSteps] = useState(tierSteps[tier as keyof typeof tierSteps]);

  // Initialize proof data
  useEffect(() => {
    setProofData({
      tier,
      timestamp: new Date().toISOString(),
    });
  }, [tier]);

  const handleZKPassportVerification = async () => {
    setIsProcessing(true);
    try {
      // Simulate ZKPassport verification
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const zkProof = {
        verified: true,
        nullifier: "0x" + Math.random().toString(16).slice(2),
        timestamp: new Date().toISOString(),
      };

      setProofData((prev) => ({
        ...prev!,
        zkPassport: zkProof,
      }));

      // Mark step as completed
      setSteps((prev) =>
        prev.map((step, idx) =>
          idx === 0 ? { ...step, status: "completed" } : step
        )
      );

      setCurrentStep(1);

      // If tier 1 (anonymity), we're done
      if (tier === "anonymity") {
        setTimeout(() => {
          completeProcess({
            ...proofData!,
            zkPassport: zkProof,
          });
        }, 1000);
      }
    } catch {
      setError("ZKPassport verification failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWalletConnection = async () => {
    setIsProcessing(true);
    try {
      // This will be handled by the wallet provider
      // For now, simulate wallet connection
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const walletData = {
        address: "0x" + Math.random().toString(16).slice(2, 42),
        signature: "0x" + Math.random().toString(16).slice(2),
      };

      setProofData((prev) => ({
        ...prev!,
        walletAddress: walletData.address,
        walletSignature: walletData.signature,
      }));

      // Mark step as completed
      setSteps((prev) =>
        prev.map((step, idx) =>
          idx === 1 ? { ...step, status: "completed" } : step
        )
      );

      setCurrentStep(2);

      // If tier 2 (pseudoAnon), we're done
      if (tier === "pseudoAnon") {
        setTimeout(() => {
          completeProcess({
            ...proofData!,
            walletAddress: walletData.address,
            walletSignature: walletData.signature,
          });
        }, 1000);
      }
    } catch {
      setError("Wallet connection failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleIdentityVerification = async () => {
    setIsProcessing(true);
    try {
      // Simulate Hyli identity verification
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const identityData = {
        verified: true,
        did: "did:hyli:" + Math.random().toString(16).slice(2),
        credentials: ["age", "nationality"],
      };

      setProofData((prev) => ({
        ...prev!,
        hyliIdentity: identityData,
      }));

      // Mark step as completed
      setSteps((prev) =>
        prev.map((step, idx) =>
          idx === 2 ? { ...step, status: "completed" } : step
        )
      );

      setTimeout(() => {
        completeProcess({
          ...proofData!,
          hyliIdentity: identityData,
        });
      }, 1000);
    } catch {
      setError("Identity verification failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const completeProcess = async (finalData: ProofData) => {
    setIsProcessing(true);
    try {
      // Get recorded video from session storage
      const recordedVideo = sessionStorage.getItem("recorded_video");

      if (!recordedVideo) {
        throw new Error("No recorded video found");
      }

      // Here you would upload to IPFS and embed proofs
      // For now, simulate the process
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Store final result
      sessionStorage.setItem("final_proof", JSON.stringify(finalData));
      sessionStorage.setItem(
        "video_cid",
        "Qm" + Math.random().toString(16).slice(2)
      );

      setIsComplete(true);

      // Navigate to success page
      setTimeout(() => {
        router.push(`/success?tier=${tier}`);
      }, 2000);
    } catch {
      setError("Failed to complete verification process");
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentStepAction = () => {
    switch (currentStep) {
      case 0:
        return (
          <Button
            onClick={handleZKPassportVerification}
            disabled={isProcessing}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase border-4 border-black"
          >
            {isProcessing ? "VERIFYING..." : "START ZKPASSPORT VERIFICATION"}
          </Button>
        );
      case 1:
        return (
          <Button
            onClick={handleWalletConnection}
            disabled={isProcessing}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold uppercase border-4 border-black"
          >
            {isProcessing ? "CONNECTING..." : "CONNECT HYLI WALLET"}
          </Button>
        );
      case 2:
        return (
          <Button
            onClick={handleIdentityVerification}
            disabled={isProcessing}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase border-4 border-black"
          >
            {isProcessing ? "VERIFYING..." : "VERIFY IDENTITY"}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-mono">
      {/* Header */}
      <header className="border-b-4 border-black bg-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="text-2xl font-bold uppercase tracking-wider">
            TRUTHSEEKER
          </div>
          <div className="text-sm font-bold uppercase tracking-wide border-2 border-black px-3 py-1">
            PROOF GENERATION
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold uppercase tracking-tight mb-8 text-center">
            GENERATING PROOFS
          </h1>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex justify-center items-center space-x-4">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center">
                  <div
                    className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold ${
                      step.status === "completed"
                        ? "bg-green-500 border-green-500 text-white"
                        : step.status === "active" || idx === currentStep
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-gray-300 border-gray-300 text-gray-600"
                    }`}
                  >
                    {step.status === "completed" ? "✓" : idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-16 h-1 ${
                        steps[idx + 1].status === "completed" ||
                        idx < currentStep
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center mt-4">
              <div className="text-center">
                <div className="font-bold text-lg">
                  {steps[currentStep]?.name || "COMPLETE"}
                </div>
                <div className="text-sm text-gray-600">
                  Step {currentStep + 1} of {steps.length}
                </div>
              </div>
            </div>
          </div>

          {/* Current Step Content */}
          <div className="border-4 border-black bg-white p-8 mb-8">
            {!isComplete ? (
              <div className="text-center space-y-6">
                <div className="text-6xl mb-4">
                  {currentStep === 0 && "🔐"}
                  {currentStep === 1 && "💳"}
                  {currentStep === 2 && "🪪"}
                </div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold uppercase">
                    {steps[currentStep]?.name}
                  </h2>

                  {currentStep === 0 && (
                    <p className="font-mono text-sm">
                      Verify your humanity using ZKPassport zero-knowledge
                      proofs. This proves you are human without revealing your
                      identity.
                    </p>
                  )}

                  {currentStep === 1 && (
                    <p className="font-mono text-sm">
                      Connect your Hyli wallet to link your address with the
                      proof. This enables traceable authenticity while
                      maintaining privacy.
                    </p>
                  )}

                  {currentStep === 2 && (
                    <p className="font-mono text-sm">
                      Verify your identity using Hyli Protocol credentials. This
                      provides full verifiable identity with audit trail.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-100 border-2 border-red-500 text-red-700 p-4 font-mono text-sm">
                    ERROR: {error}
                  </div>
                )}

                <div className="pt-4">{getCurrentStepAction()}</div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold uppercase text-green-600">
                  VERIFICATION COMPLETE
                </h2>
                <p className="font-mono text-sm">
                  Your proof has been generated and embedded in the video.
                  Redirecting to success page...
                </p>
              </div>
            )}
          </div>

          {/* Tier Information */}
          <div className="border-4 border-black bg-black text-white p-6">
            <h3 className="font-bold uppercase text-lg mb-4">
              TIER: {tier.toUpperCase()}
            </h3>
            <div className="font-mono text-sm space-y-2">
              {tier === "anonymity" && (
                <>
                  <p>• Anonymous proof of humanity</p>
                  <p>• No wallet or identity required</p>
                  <p>• Maximum privacy protection</p>
                </>
              )}
              {tier === "pseudoAnon" && (
                <>
                  <p>• Proof of humanity + wallet signature</p>
                  <p>• Traceable to wallet address</p>
                  <p>• Enhanced authenticity verification</p>
                </>
              )}
              {tier === "identity" && (
                <>
                  <p>• Full identity verification</p>
                  <p>• Government-grade authentication</p>
                  <p>• Complete audit trail</p>
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
