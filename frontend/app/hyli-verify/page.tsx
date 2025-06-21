"use client";

import { useState } from "react";
import { useWallet } from "../components/ClientWalletProvider";

export default function HyliVerifyPage() {
  const { wallet } = useWallet();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [hyliVerified, setHyliVerified] = useState(false);

  // Form state
  const [proofData, setProofData] = useState({
    proof: "",
    vkey_hash: "",
    name: "outer_evm_count_5",
    version: "1.0.0",
    current_date: new Date().toISOString().split("T")[0],
    min_age: 18,
    max_age: 120,
    user_address: "0x5e4B11F7B7995F5Cee0134692a422b045091112F",
    custom_data: "email:test@test.com,customer_id:1234567890",
    hyli_identity: "",
  });

  const submitToHyli = async () => {
    if (!wallet?.address) {
      setMessage("Please connect your wallet first");
      return;
    }

    if (!proofData.proof.trim() || !proofData.vkey_hash.trim()) {
      setMessage("Please provide both proof and vkey_hash");
      return;
    }

    try {
      setLoading(true);
      setMessage("Submitting to Hyli network...");

      // Prepare the zkpassport action for Hyli
      const zkPassportAction = {
        VerifyIdentity: {
          proof: {
            proof: proofData.proof,
            vkey_hash: proofData.vkey_hash,
            name: proofData.name,
            version: proofData.version,
            committed_inputs: {
              compare_age_evm: {
                current_date: proofData.current_date,
                min_age: proofData.min_age,
                max_age: proofData.max_age,
              },
              bind_evm: {
                data: {
                  user_address: proofData.user_address,
                  custom_data: proofData.custom_data,
                },
              },
            },
          },
          hyli_identity: proofData.hyli_identity || wallet.address,
        },
      };

      // Create blob for Hyli transaction
      const blob = {
        contract_name: "zkpassport",
        data: zkPassportAction,
      };

      const baseUrl =
        process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:4002";

      const headers = new Headers();
      headers.append("content-type", "application/json");
      headers.append("x-user", `${wallet.address}@zkpassport`);

      // Add session key information if available
      if (wallet?.sessionKey) {
        headers.append("x-session-key", JSON.stringify(wallet.sessionKey));
        headers.append("x-request-signature", "manual-verification");
      }

      const response = await fetch(`${baseUrl}/api/zkpassport/verify`, {
        method: "POST",
        headers: headers,
        body: JSON.stringify({ blob }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hyli verification failed: ${errorText}`);
      }

      const result = await response.json();
      setHyliVerified(true);
      setTxHash(result.tx_hash || "");
      setMessage("Successfully verified on Hyli network!");

      // Poll for transaction confirmation
      if (result.tx_hash) {
        try {
          setMessage("Polling for transaction confirmation...");
          await pollTransactionStatus(result.tx_hash);
          setMessage("Transaction confirmed on Hyli network!");
        } catch (error) {
          console.warn("Transaction polling failed:", error);
          setMessage("Submitted to Hyli network (confirmation pending)");
        }
      }
    } catch (error) {
      console.error("Error submitting to Hyli network:", error);
      setHyliVerified(false);
      setMessage(
        `Hyli verification error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setLoading(false);
    }
  };

  const pollTransactionStatus = async (txHash: string): Promise<void> => {
    const maxAttempts = 30; // 30 seconds timeout
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const nodeUrl =
          process.env.NEXT_PUBLIC_NODE_BASE_URL || "http://localhost:4321";
        const response = await fetch(
          `${nodeUrl}/v1/indexer/transaction/hash/${txHash}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        const data = await response.json();
        if (data.transaction_status === "Success") {
          return;
        }

        // Wait 1 second before next attempt
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      } catch (error) {
        console.error("Error polling transaction:", error);
        // Continue polling even if there's an error
        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    throw new Error(
      `Transaction ${txHash} timed out after ${maxAttempts} seconds`
    );
  };

  const resetForm = () => {
    setProofData({
      proof: "",
      vkey_hash: "",
      name: "outer_evm_count_5",
      version: "1.0.0",
      current_date: new Date().toISOString().split("T")[0],
      min_age: 18,
      max_age: 120,
      user_address: "0x5e4B11F7B7995F5Cee0134692a422b045091112F",
      custom_data: "email:test@test.com,customer_id:1234567890",
      hyli_identity: "",
    });
    setMessage("");
    setTxHash("");
    setHyliVerified(false);
  };

  const loadSampleData = () => {
    setProofData({
      ...proofData,
      proof: "sample_proof_data_here",
      vkey_hash: "sample_vkey_hash_here",
    });
  };

  if (!wallet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Wallet Required
          </h2>
          <p className="text-gray-600">
            Please connect your Hyli wallet to verify proofs on-chain
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Manual Hyli Verification
          </h1>
          <p className="text-lg text-gray-600">
            Submit ZK proofs directly to Hyli blockchain
          </p>
          <div className="mt-4 inline-flex items-center px-4 py-2 bg-white rounded-full shadow-sm">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
            <span className="text-sm font-medium text-gray-700">
              Connected: {wallet.address.slice(0, 6)}...
              {wallet.address.slice(-4)}
            </span>
            {wallet.sessionKey && (
              <span className="ml-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                Session Key Active
              </span>
            )}
          </div>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Form */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Proof Details
              </h2>

              {/* Proof */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proof *
                </label>
                <textarea
                  value={proofData.proof}
                  onChange={(e) =>
                    setProofData({ ...proofData, proof: e.target.value })
                  }
                  placeholder="Enter the ZK proof data..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={4}
                  disabled={loading}
                />
              </div>

              {/* VKey Hash */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VKey Hash *
                </label>
                <input
                  type="text"
                  value={proofData.vkey_hash}
                  onChange={(e) =>
                    setProofData({ ...proofData, vkey_hash: e.target.value })
                  }
                  placeholder="Enter the verification key hash..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Name and Version */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={proofData.name}
                    onChange={(e) =>
                      setProofData({ ...proofData, name: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Version
                  </label>
                  <input
                    type="text"
                    value={proofData.version}
                    onChange={(e) =>
                      setProofData({ ...proofData, version: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Age Range */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Age
                  </label>
                  <input
                    type="number"
                    value={proofData.min_age}
                    onChange={(e) =>
                      setProofData({
                        ...proofData,
                        min_age: parseInt(e.target.value) || 18,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Age
                  </label>
                  <input
                    type="number"
                    value={proofData.max_age}
                    onChange={(e) =>
                      setProofData({
                        ...proofData,
                        max_age: parseInt(e.target.value) || 120,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Date
                  </label>
                  <input
                    type="date"
                    value={proofData.current_date}
                    onChange={(e) =>
                      setProofData({
                        ...proofData,
                        current_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* User Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  User Address
                </label>
                <input
                  type="text"
                  value={proofData.user_address}
                  onChange={(e) =>
                    setProofData({ ...proofData, user_address: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Custom Data */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Data
                </label>
                <input
                  type="text"
                  value={proofData.custom_data}
                  onChange={(e) =>
                    setProofData({ ...proofData, custom_data: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Hyli Identity */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hyli Identity (optional)
                </label>
                <input
                  type="text"
                  value={proofData.hyli_identity}
                  onChange={(e) =>
                    setProofData({
                      ...proofData,
                      hyli_identity: e.target.value,
                    })
                  }
                  placeholder="Leave empty to use wallet address"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={loadSampleData}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Load Sample Data
                </button>
                <button
                  onClick={resetForm}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Reset Form
                </button>
              </div>
            </div>

            {/* Right Column - Status */}
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Verification Status
              </h2>

              {/* Status Card */}
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Hyli Network
                  </h3>
                  <div
                    className={`w-3 h-3 rounded-full ${
                      hyliVerified ? "bg-green-500" : "bg-gray-300"
                    }`}
                  ></div>
                </div>

                {loading && (
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-600">Processing...</span>
                  </div>
                )}

                {message && (
                  <div
                    className={`p-4 rounded-lg mb-4 ${
                      hyliVerified
                        ? "bg-green-50 text-green-800 border border-green-200"
                        : message.includes("error") ||
                          message.includes("failed")
                        ? "bg-red-50 text-red-800 border border-red-200"
                        : "bg-blue-50 text-blue-800 border border-blue-200"
                    }`}
                  >
                    <p className="text-sm font-medium">{message}</p>
                  </div>
                )}

                {txHash && (
                  <div className="bg-white p-4 rounded-lg border">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Transaction Hash
                    </h4>
                    <p className="text-xs text-gray-600 break-all font-mono">
                      {txHash}
                    </p>
                    <a
                      href={`http://localhost:4321/v1/indexer/transaction/hash/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-800"
                    >
                      View on Explorer
                      <svg
                        className="w-4 h-4 ml-1"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={submitToHyli}
                  disabled={
                    loading ||
                    !proofData.proof.trim() ||
                    !proofData.vkey_hash.trim()
                  }
                  className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl hover:from-green-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-semibold text-lg shadow-lg"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "🚀 Verify on Hyli"
                  )}
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">
                  📋 Instructions
                </h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Fill in the proof and vkey_hash fields (required)</li>
                  <li>• Adjust other parameters as needed</li>
                  <li>• Click "Verify on Hyli" to submit to blockchain</li>
                  <li>• Use "Load Sample Data" for testing</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
