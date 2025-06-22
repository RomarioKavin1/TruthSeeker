"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import TierVisualization from "@/components/TierVisualization";

export default function TierSelectionPage() {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const tiers = {
    anonymity: {
      name: "ANONYMITY",
      icon: "🔒",
      features: ["✓ PROOF OF HUMANITY", "✕ WALLET", "✕ IDENTITY"],
      description: "ZKPASSPORT VERIFICATION ONLY",
    },
    pseudoAnon: {
      name: "PSEUDO-ANONYMITY",
      icon: "🕶️",
      features: ["✓ ZKPASSPORT", "✓ WALLET SIGNATURE", "✕ IDENTITY"],
      description: "INHERITS ANONYMITY + WALLET LINKING",
    },
    identity: {
      name: "IDENTITY",
      icon: "🪪",
      features: ["✓ EVERYTHING ABOVE", "✓ IDENTITY VIA HYLI PROTOCOL"],
      description: "FULL VERIFIABLE CREDENTIALS",
    },
  };

  return (
    <div className="min-h-screen bg-gray-100 font-mono">
      {/* Header */}
      <header className="border-b-4 border-black bg-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="text-2xl font-bold uppercase tracking-wider hover:bg-black hover:text-white px-2 py-1 transition-colors"
          >
            TRUTHSEEKER
          </Link>
          <div className="text-sm font-bold uppercase tracking-wide border-2 border-black px-3 py-1">
            TIER SELECTION
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold uppercase tracking-tight mb-8 text-center">
            SELECT PRIVACY TIER
          </h1>

          {/* Continue Button - Moved to Top */}
          <div className="text-center mb-12">
            <Link
              href={selectedTier ? `/proof-process?tier=${selectedTier}` : "#"}
            >
              <Button
                className={`px-12 py-6 font-bold uppercase text-lg border-4 transition-all duration-300 transform ${
                  selectedTier
                    ? "bg-black text-white border-black hover:bg-white hover:text-black hover:scale-105 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] cursor-pointer"
                    : "bg-gray-300 text-gray-500 border-gray-300 cursor-not-allowed opacity-50"
                }`}
                disabled={!selectedTier}
              >
                {selectedTier
                  ? "CONTINUE TO VERIFICATION"
                  : "SELECT TIER TO CONTINUE"}
              </Button>
            </Link>
          </div>

          {/* Main Content Grid - Equal Heights */}
          <div className="grid lg:grid-cols-2 gap-16 items-stretch">
            {/* Tier Selection - Left Side */}
            <div className="flex flex-col space-y-4">
              {Object.entries(tiers).map(([key, tier]) => (
                <div
                  key={key}
                  className={`border-4 border-black p-6 cursor-pointer transition-all duration-300 transform hover:scale-105 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex-1 ${
                    selectedTier === key
                      ? "bg-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
                      : "bg-white hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedTier(key)}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-2xl">{tier.icon}</div>
                    <div>
                      <h3
                        className={`font-bold uppercase text-lg ${
                          selectedTier === key ? "text-white" : "text-black"
                        }`}
                      >
                        {tier.name}
                      </h3>
                      <p
                        className={`text-sm font-mono ${
                          selectedTier === key
                            ? "text-gray-300"
                            : "text-gray-600"
                        }`}
                      >
                        {tier.description}
                      </p>
                    </div>
                  </div>

                  <div className="font-mono text-sm space-y-1">
                    {tier.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center">
                        <span
                          className={`w-4 text-center mr-2 font-bold ${
                            selectedTier === key ? "text-white" : "text-black"
                          }`}
                        >
                          {feature.startsWith("✓") ? "✓" : "✕"}
                        </span>
                        <span
                          className={`${
                            feature.startsWith("✓")
                              ? selectedTier === key
                                ? "text-white"
                                : "text-black"
                              : selectedTier === key
                              ? "text-gray-400"
                              : "text-gray-500"
                          }`}
                        >
                          {feature.substring(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Click indicator */}
                  <div
                    className={`mt-4 text-xs font-mono ${
                      selectedTier === key ? "text-gray-300" : "text-gray-500"
                    }`}
                  >
                    {selectedTier === key ? "✓ SELECTED" : "CLICK TO SELECT"}
                  </div>
                </div>
              ))}
            </div>

            {/* Right Side - Technical Details */}
            <div className="flex flex-col space-y-6 h-full">
              {/* Technical Details */}
              <div className="border-4 border-black bg-white p-8 flex-shrink-0">
                <h2 className="font-bold uppercase text-lg mb-4 border-b-2 border-black pb-2">
                  TECHNICAL SPECS
                </h2>

                {selectedTier ? (
                  <div className="font-mono text-sm space-y-4">
                    <div>
                      <div className="font-bold uppercase mb-2">
                        SELECTED:{" "}
                        {tiers[selectedTier as keyof typeof tiers].name}
                      </div>
                      <div className="bg-gray-100 p-4 border-2 border-gray-300">
                        <pre className="text-xs leading-relaxed">
                          {selectedTier === "anonymity" &&
                            `ANONYMITY:
  ✓ ZKPassport Nullifier
  ✓ Zero-Knowledge Proof
  ✓ Steganographic Embedding
  ✕ Wallet Signature
  ✕ Identity Credential

PRIVACY: MAXIMUM
VERIFIABILITY: BASIC`}

                          {selectedTier === "pseudoAnon" &&
                            `PSEUDO-ANONYMITY:
  ✓ ZKPassport Nullifier
  ✓ Hyli Wallet Signature
  ✓ Steganographic Embedding
  ✓ On-chain Verification
  ✕ Identity Credential

PRIVACY: HIGH
VERIFIABILITY: ENHANCED`}

                          {selectedTier === "identity" &&
                            `IDENTITY:
  ✓ ZKPassport Nullifier
  ✓ Hyli Wallet Signature
  ✓ Hyli Protocol Identity
  ✓ Verifiable Credentials
  ✓ Full Audit Trail

PRIVACY: CONTROLLED
VERIFIABILITY: MAXIMUM`}
                        </pre>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 font-mono text-sm">
                    SELECT A TIER TO VIEW TECHNICAL DETAILS
                  </div>
                )}
              </div>

              {/* Subset Diagram - Below Technical Specs - Takes remaining space */}
              <div className="flex-1 min-h-0">
                <TierVisualization selectedTier={selectedTier} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
