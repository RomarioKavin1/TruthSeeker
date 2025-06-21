"use client";

import {
  WalletProvider as HyliWalletProvider,
  HyliWallet,
  useWallet,
} from "hyli-wallet";
import { ReactNode } from "react";

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  // Only render the wallet provider on the client side
  if (typeof window === "undefined") {
    return <>{children}</>;
  }

  return (
    <HyliWalletProvider
      config={{
        nodeBaseUrl:
          process.env.NEXT_PUBLIC_NODE_BASE_URL || "http://localhost:4000",
        walletServerBaseUrl:
          process.env.NEXT_PUBLIC_WALLET_SERVER_BASE_URL ||
          "http://localhost:4002",
        applicationWsUrl:
          process.env.NEXT_PUBLIC_WALLET_WS_URL || "ws://localhost:4003",
      }}
      sessionKeyConfig={{
        duration: 24 * 60 * 60 * 1000, // Session key duration in ms (default: 24h)
        whitelist: ["contract1", "contract2", "zkpassport"], // Required: contracts allowed for session key
      }}
      onWalletEvent={(event) => {
        console.log("Wallet event:", event);
      }}
      onError={(error) => {
        console.error("Wallet error:", error);
      }}
    >
      {children}
    </HyliWalletProvider>
  );
}

function WalletConnectPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">TruthSeeker</h1>
          <p className="text-gray-600">
            Connect your wallet to access ZK verification features
          </p>
        </div>

        <div className="space-y-4">
          <HyliWallet providers={["password", "google", "github"]} />
        </div>

        <div className="mt-8 text-sm text-gray-500">
          <p>Secure • Private • Zero-Knowledge</p>
        </div>
      </div>
    </div>
  );
}

export { useWallet, WalletConnectPage };
