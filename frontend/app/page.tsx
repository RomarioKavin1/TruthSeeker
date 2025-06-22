"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import MorphingAnimation from "@/components/MorphingAnimation";
import { useEffect } from "react";
import BackendStatus from "@/components/BackendStatus";

export default function LandingPage() {
  useEffect(() => {
    // Clear any stale reference data when returning to home
    sessionStorage.removeItem("proof_ref");
  }, []);
  return (
    <div className="min-h-screen bg-gray-100 font-mono">
      {/* Header */}
      <header className="border-b-4 border-black bg-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold uppercase tracking-wider">
              TRUTHSEEKER
            </div>
            <BackendStatus size="small" />
          </div>
          <nav className="flex gap-4">
            <Link
              href="/sandbox"
              className="border-2 border-black bg-white px-4 py-2 font-bold uppercase hover:bg-black hover:text-white transition-colors"
            >
              SANDBOX
            </Link>
            <Link
              href="/dashboard"
              className="border-2 border-black bg-white px-4 py-2 font-bold uppercase hover:bg-black hover:text-white transition-colors"
            >
              DASHBOARD
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-6xl font-bold uppercase tracking-tight leading-none">
                PROVE
                <br />
                REALITY.
              </h1>
              <p className="text-xl font-bold uppercase tracking-wide text-gray-600">
                A PRIVACY-FIRST PLATFORM FOR
                <br />
                VERIFIED, UNDENIABLE CONTENT
              </p>
            </div>

            {/* Prominent Backend Status */}
            <BackendStatus size="large" />

            {/* Privacy Tier Cards */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold uppercase tracking-wide border-b-2 border-black pb-2">
                SELECT PRIVACY LEVEL
              </h2>

              <div className="grid gap-4">
                <Link href="/tier-selection">
                  <div className="border-4 border-black bg-white p-6 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">🔒</div>
                      <div>
                        <h3 className="font-bold uppercase text-lg">
                          ANONYMITY
                        </h3>
                        <p className="text-sm text-gray-600 font-mono">
                          PROOF OF HUMANITY ONLY
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {">"} PROOF OF HUMANITY WITHOUT IDENTITY DISCLOSURE
                    </div>
                  </div>
                </Link>

                <Link href="/tier-selection">
                  <div className="border-4 border-black bg-white p-6 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">🕶️</div>
                      <div>
                        <h3 className="font-bold uppercase text-lg">
                          PSEUDO-ANONYMITY
                        </h3>
                        <p className="text-sm text-gray-600 font-mono">
                          WALLETADDRESS + PROOF OF HUMANITY
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {">"} CRYPTOGRAPHIC SIGNATURE + HUMANITY PROOF
                    </div>
                  </div>
                </Link>

                <Link href="/tier-selection">
                  <div className="border-4 border-black bg-white p-6 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">🪪</div>
                      <div>
                        <h3 className="font-bold uppercase text-lg">
                          IDENTITY
                        </h3>
                        <p className="text-sm text-gray-600 font-mono">
                          NAME/AGE/NATIONALITY + PROOF OF HUMANITY
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 text-xs font-mono text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {">"} FULL VERIFIABLE CREDENTIALS + ALL ABOVE
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            <Link href="/tier-selection">
              <Button className="w-full bg-black text-white border-4 border-black font-bold uppercase text-lg py-6 hover:bg-white hover:text-black transition-colors">
                START RECORDING
              </Button>
            </Link>
          </div>

          {/* Morphing Animation */}
          <div className="hidden lg:flex lg:justify-center lg:items-start lg:pt-8">
            <div className="w-full">
              <MorphingAnimation />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-4 border-black bg-white p-4 mt-16">
        <div className="container mx-auto text-center font-mono text-sm text-gray-600">
          <p>BUILT FOR TRUTH. POWERED BY CRYPTOGRAPHY.</p>
        </div>
      </footer>
    </div>
  );
}
