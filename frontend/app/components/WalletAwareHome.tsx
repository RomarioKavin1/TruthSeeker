"use client";

import Link from "next/link";
import { useWallet, WalletConnectPage } from "./ClientWalletProvider";

function LogoutButton() {
  const { logout } = useWallet();

  return (
    <button
      onClick={() => logout()}
      className="text-sm text-gray-600 hover:text-gray-900 px-3 py-1 rounded-md hover:bg-gray-100"
    >
      Logout
    </button>
  );
}

export default function WalletAwareHome() {
  const { wallet } = useWallet();

  // Show wallet connection screen if no wallet is connected
  if (!wallet) {
    return <WalletConnectPage />;
  }

  // Show main application once wallet is connected
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header with wallet info */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">TruthSeeker</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="inline-flex items-center px-4 py-2 bg-green-50 border border-green-200 rounded-full">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-gray-700">
                  {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                </span>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Welcome to TruthSeeker
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Your wallet is connected! Start verifying your identity with
            zero-knowledge proofs and discover truth through blockchain-verified
            content.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-lg text-gray-700">
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">
              🔒 Zero-Knowledge Proofs
            </span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">
              ⛓️ Blockchain Verified
            </span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">
              🌐 Decentralized
            </span>
            <span className="bg-white px-4 py-2 rounded-full shadow-sm">
              🔍 Truth Discovery
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              ZK Identity Verification
            </h3>
            <p className="text-gray-600 mb-6">
              Verify your identity privately using zero-knowledge proofs without
              revealing personal information.
            </p>
            <div className="space-y-3">
              <Link
                href="/zkpass"
                className="block w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-3 rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all font-semibold"
              >
                Basic ZK Verification
              </Link>
              <Link
                href="/zkpass-wallet"
                className="block w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-3 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all font-semibold"
              >
                ZK + Wallet Integration
              </Link>
              <Link
                href="/hyli-verify"
                className="block w-full bg-gradient-to-r from-green-500 to-teal-500 text-white text-center py-3 rounded-xl hover:from-green-600 hover:to-teal-600 transition-all font-semibold"
              >
                Manual Hyli Verification
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl mb-6 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Hyli Network
            </h3>
            <p className="text-gray-600 mb-6">
              Submit verified content to the Hyli blockchain for permanent,
              tamper-proof storage.
            </p>
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                <p className="text-sm text-green-800 font-medium">
                  ✅ Wallet Connected
                </p>
                <p className="text-xs text-green-600">
                  Ready for blockchain transactions
                </p>
              </div>
              <Link
                href="/hyli-verify"
                className="block w-full bg-gradient-to-r from-green-500 to-teal-500 text-white text-center py-3 rounded-xl hover:from-green-600 hover:to-teal-600 transition-all font-semibold"
              >
                🔧 Manual Proof Verification
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-shadow">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl mb-6 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Truth Discovery
            </h3>
            <p className="text-gray-600 mb-6">
              Explore verified content and discover truth through
              community-driven verification.
            </p>
            <button className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-3 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all font-semibold">
              Coming Soon
            </button>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-blue-600 font-bold text-xl">1</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Connect
              </h3>
              <p className="text-gray-600">
                Connect your Hyli wallet and verify your identity using ZK
                proofs
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-purple-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Verify
              </h3>
              <p className="text-gray-600">
                Submit content for blockchain verification and truth scoring
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-green-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Discover
              </h3>
              <p className="text-gray-600">
                Explore verified content and contribute to truth discovery
              </p>
            </div>
          </div>
        </div>

        {/* Wallet Info Section */}
        <div className="mt-16 bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Wallet Information
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Address</h4>
              <code className="text-sm bg-white px-3 py-2 rounded border block break-all">
                {wallet.address}
              </code>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-2">Status</h4>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-green-700 font-medium">
                  Connected & Ready
                </span>
              </div>
            </div>
            {wallet.sessionKey && (
              <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                <h4 className="font-semibold text-gray-800 mb-2">
                  Session Key
                </h4>
                <div className="text-sm text-gray-600">
                  <p>✅ Session key active</p>
                  <p>
                    Expires:{" "}
                    {new Date(wallet.sessionKey.expiration).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
