"use client";
import { useEffect, useRef, useState } from "react";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import QRCode from "react-qr-code";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { useWallet } from "hyli-wallet";
import { contractService } from "../services/ContractService";

export default function ZKPassWalletPage() {
  const { wallet, signMessageWithSessionKey } = useWallet();
  const [message, setMessage] = useState("");
  const [isOver18, setIsOver18] = useState<boolean | undefined>(undefined);
  const [queryUrl, setQueryUrl] = useState("");
  const [uniqueIdentifier, setUniqueIdentifier] = useState("");
  const [verified, setVerified] = useState<boolean | undefined>(undefined);
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [onChainVerified, setOnChainVerified] = useState<boolean | undefined>(
    undefined
  );
  const [hyliVerified, setHyliVerified] = useState<boolean | undefined>(
    undefined
  );
  const [proofData, setProofData] = useState<ProofResult[]>([]);
  const [contractAddress, setContractAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState("");
  const zkPassportRef = useRef<ZKPassport | null>(null);

  const resetState = () => {
    setMessage("");
    setQueryUrl("");
    setIsOver18(undefined);
    setUniqueIdentifier("");
    setVerified(undefined);
    setOnChainVerified(undefined);
    setHyliVerified(undefined);
    setProofData([]);
    setContractAddress("");
    setTxHash("");
    setLoading(false);
    setRequestInProgress(false);
  };

  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport(window.location.hostname);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      if (zkPassportRef.current) {
        // Reset any ongoing requests
        setRequestInProgress(false);
        setLoading(false);
      }
    };
  }, []);

  const submitToHyliNetwork = async (
    proof: ProofResult,
    userAddress: string
  ) => {
    try {
      setLoading(true);

      // Prepare the zkpassport action for Hyli
      const zkPassportAction = {
        VerifyIdentity: {
          proof: {
            proof: proof.proof || "",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            vkey_hash: ((proof as any).vkeyHash || "") as string,
            name: proof.name || "outer_evm_count_5",
            version: proof.version || "1.0.0",
            committed_inputs: {
              compare_age_evm: {
                current_date: new Date().toISOString().split("T")[0],
                min_age: 18,
                max_age: 120,
              },
              bind_evm: {
                data: {
                  user_address: userAddress,
                  custom_data: `verified_at:${new Date().toISOString()}`,
                },
              },
            },
          },
          hyli_identity: userAddress,
        },
      };

      // Create blob for Hyli transaction
      // Send the ZKPassportAction directly and let the server convert it to a proper Blob
      const blob = {
        contract_name: "zkpassport",
        data: zkPassportAction,
      };

      const baseUrl =
        process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:4002";

      const headers = new Headers();
      headers.append("content-type", "application/json");

      // Use zkpassport as the identity contract since we're sending a zkpassport blob
      // This satisfies the requirement that there must be a blob with the same contract name
      headers.append("x-user", `${userAddress}@zkpassport`);

      // Add session key information if available
      if (wallet?.sessionKey) {
        headers.append("x-session-key", JSON.stringify(wallet.sessionKey));
        headers.append("x-request-signature", "test-signature");
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
          await contractService.pollTransactionStatus(result.tx_hash);
          setMessage("Transaction confirmed on Hyli network!");
        } catch (error) {
          console.warn("Transaction polling failed:", error);
          setMessage("Submitted to Hyli network (confirmation pending)");
        }
      }

      return result;
    } catch (error) {
      console.error("Error submitting to Hyli network:", error);
      setHyliVerified(false);
      setMessage(
        `Hyli verification error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createRequest = async () => {
    if (!zkPassportRef.current) {
      return;
    }

    if (!wallet?.address) {
      setMessage("Please connect your wallet first");
      return;
    }

    // Prevent multiple simultaneous requests
    if (requestInProgress || loading) {
      setMessage("Request already in progress, please wait...");
      return;
    }

    resetState();

    const queryBuilder = await zkPassportRef.current.request({
      name: "ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Proof of adulthood",
      scope: "adult",
      mode: "compressed-evm",
      devMode: true,
      evmChain: "ethereum_sepolia",
    });

    const {
      url,
      onRequestReceived,
      onGeneratingProof,
      onProofGenerated,
      onResult,
      onReject,
      onError,
    } = queryBuilder
      .gte("age", 18)
      .bind("user_address", "0x5e4B11F7B7995F5Cee0134692a422b045091112F")
      .bind("custom_data", "email:test@test.com,customer_id:1234567890")
      .done();

    setQueryUrl(url);
    console.log(url);

    setRequestInProgress(true);

    onRequestReceived(() => {
      console.log("QR code scanned");
      setMessage("Request received");
    });

    onGeneratingProof(() => {
      console.log("Generating proof");
      setMessage("Generating proof...");
    });

    const proofs: ProofResult[] = [];

    onProofGenerated(async (proof: ProofResult) => {
      console.log("Proof result", proof);
      proofs.push(proof);
      setProofData([...proofs]);
      setMessage(`Proofs received`);
      setRequestInProgress(false);

      if (!zkPassportRef.current) {
        return;
      }

      try {
        // Pass the proof you've received from the user to this function
        // along with the scope you've used above and the function will return
        // all the parameters needed to call the verifier contract
        const params = zkPassportRef.current.getSolidityVerifierParameters({
          proof,
          scope: "adult",
          devMode: true,
        });

        // Get the details of the verifier contract: its address, its abi and the function name
        // For now the verifier contract is only deployed on Ethereum Sepolia
        const { address, abi, functionName } =
          zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

        setContractAddress(address);

        // Create a public client for sepolia
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
        });

        // Use the public client to call the verify function of the ZKPassport verifier contract
        const contractCallResult = await publicClient.readContract({
          address,
          abi,
          functionName,
          args: [params],
        });

        console.log("Contract call result", contractCallResult);
        // The result is an array with the first element being a boolean indicating if the proof is valid
        // and the second element being the unique identifier
        const isVerified = Array.isArray(contractCallResult)
          ? Boolean(contractCallResult[0])
          : false;
        const contractUniqueIdentifier = Array.isArray(contractCallResult)
          ? String(contractCallResult[1])
          : "";
        setOnChainVerified(isVerified);
        if (contractUniqueIdentifier) {
          console.log("Contract unique identifier:", contractUniqueIdentifier);
        }

        // After Ethereum verification is done, submit to Hyli network
        if (isVerified && wallet?.address) {
          setMessage(
            "Ethereum verification successful - submitting to Hyli..."
          );
          try {
            await submitToHyliNetwork(proof, wallet.address);
          } catch (hyliError) {
            console.warn("Hyli submission failed:", hyliError);
            setMessage(
              "Ethereum verification successful, Hyli submission failed"
            );
          }
        }
      } catch (error) {
        console.error("Error preparing verification:", error);
      }
    });

    onResult(
      async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
        console.log("Result of the query", result);
        console.log("Query result errors", queryResultErrors);
        setIsOver18(result?.age?.gte?.result);
        setMessage("Result received");
        setUniqueIdentifier(uniqueIdentifier || "");
        setVerified(verified);
        setRequestInProgress(false);

        /*const res = await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify({
          queryResult: result,
          proofs,
        }),
      });

      console.log("Response from the server", await res.json());*/
      }
    );

    onReject(() => {
      console.log("User rejected");
      setMessage("User rejected the request");
      setRequestInProgress(false);
    });

    onError((error: unknown) => {
      console.error("Error", error);
      setMessage("An error occurred");
      setRequestInProgress(false);
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
            Please connect your Hyli wallet to access ZK verification
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            TruthSeeker ZK Verification
          </h1>
          <p className="text-lg text-gray-600">
            Secure identity verification using zero-knowledge proofs
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

        {/* Main Content */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {!queryUrl && !requestInProgress && (
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-white"
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
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Start ZK Verification
              </h2>
              <p className="text-gray-600 mb-8">
                Verify your identity privately using zero-knowledge proofs and
                submit to Hyli blockchain
              </p>
              <button
                onClick={createRequest}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 px-8 rounded-2xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Generate Verification Request"}
              </button>
            </div>
          )}

          {queryUrl && (
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Scan QR Code
              </h3>
              <p className="text-gray-600 mb-6">
                Use your ZKPassport mobile app to scan this QR code
              </p>
              <div className="inline-block p-6 bg-white rounded-2xl shadow-lg">
                <QRCode value={queryUrl} size={200} />
              </div>
            </div>
          )}

          {message && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-center">
                {loading && (
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                )}
                <p className="text-blue-800 font-medium">{message}</p>
              </div>
            </div>
          )}

          {/* Verification Results */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {typeof isOver18 === "boolean" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="font-semibold text-green-800 mb-2">
                  Age Verification
                </h4>
                <p className="text-green-700">
                  {isOver18 ? "✅ Verified: Over 18" : "❌ Under 18"}
                </p>
              </div>
            )}

            {verified !== undefined && (
              <div
                className={`border rounded-xl p-4 ${
                  verified
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <h4
                  className={`font-semibold mb-2 ${
                    verified ? "text-green-800" : "text-red-800"
                  }`}
                >
                  ZK Verification
                </h4>
                <p className={verified ? "text-green-700" : "text-red-700"}>
                  {verified ? "✅ Verified" : "❌ Failed"}
                </p>
              </div>
            )}

            {onChainVerified !== undefined && (
              <div
                className={`border rounded-xl p-4 ${
                  onChainVerified
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <h4
                  className={`font-semibold mb-2 ${
                    onChainVerified ? "text-green-800" : "text-red-800"
                  }`}
                >
                  Ethereum On-chain
                </h4>
                <p
                  className={
                    onChainVerified ? "text-green-700" : "text-red-700"
                  }
                >
                  {onChainVerified ? "✅ Verified" : "❌ Failed"}
                </p>
              </div>
            )}

            {hyliVerified !== undefined && (
              <div
                className={`border rounded-xl p-4 ${
                  hyliVerified
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <h4
                  className={`font-semibold mb-2 ${
                    hyliVerified ? "text-green-800" : "text-red-800"
                  }`}
                >
                  Hyli Network
                </h4>
                <p className={hyliVerified ? "text-green-700" : "text-red-700"}>
                  {hyliVerified ? "✅ Verified" : "❌ Failed"}
                </p>
                {txHash && (
                  <p className="text-xs text-gray-600 mt-1">
                    TX: {txHash.slice(0, 8)}...{txHash.slice(-8)}
                  </p>
                )}
              </div>
            )}
          </div>

          {uniqueIdentifier && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">
                Unique Identifier
              </h4>
              <code className="text-sm bg-white px-3 py-2 rounded border block break-all">
                {uniqueIdentifier}
              </code>
            </div>
          )}

          {contractAddress && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">
                Verifier Contract
              </h4>
              <a
                href={`https://sepolia.etherscan.io/address/${contractAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
              >
                {contractAddress}
              </a>
            </div>
          )}

          {txHash && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-2">
                Hyli Transaction
              </h4>
              <code className="text-sm bg-white px-3 py-2 rounded border block break-all">
                {txHash}
              </code>
            </div>
          )}

          {proofData.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-4">
                Generated Proofs
              </h4>
              {proofData.map((proof, index) => (
                <details key={index} className="mb-4 last:mb-0">
                  <summary className="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
                    Proof {index + 1}
                  </summary>
                  <pre className="mt-2 text-xs bg-white p-3 rounded border overflow-auto max-h-60">
                    {JSON.stringify(proof, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}

          {!requestInProgress && queryUrl && (
            <div className="text-center mt-8 space-x-4">
              <button
                onClick={createRequest}
                disabled={loading}
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Processing..." : "Generate New Request"}
              </button>
              <button
                onClick={resetState}
                disabled={loading}
                className="bg-gradient-to-r from-gray-500 to-gray-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-gray-600 hover:to-gray-700 transform hover:scale-105 transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
            </div>
          )}

          {(requestInProgress || loading) && (
            <div className="text-center mt-8">
              <button
                onClick={resetState}
                className="bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold py-3 px-6 rounded-xl hover:from-red-600 hover:to-red-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
              >
                Cancel & Reset
              </button>
              <p className="text-sm text-gray-600 mt-2">
                Click here if the verification seems stuck
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
