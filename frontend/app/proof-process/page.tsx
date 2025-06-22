"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HyliWallet, useWallet } from "hyli-wallet";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import QRCode from "react-qr-code";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { contractService } from "../services/ContractService";
import { uploadProofToIPFS, UploadResult } from "@/lib/pinata-service";
import { backendService } from "@/lib/backend-service";

interface ProofData {
  hyliWallet?: {
    address: string;
    connectedAt: string;
  };
  zkPassport?: {
    verified: boolean;
    nullifier: string;
    timestamp: string;
    proofResult?: ProofResult;
    queryUrl?: string;
  };
  onchainProof?: {
    verified: boolean;
    transactionHash: string;
    timestamp: string;
    contractAddress?: string;
    hyliTxHash?: string;
  };
  recordedVideo?: {
    blob: Blob;
    recordedAt: string;
  };
  steganographicVideo?: {
    processed: boolean;
    downloadUrl?: string;
    timestamp: string;
  };
  ipfsUpload?: {
    cid: string;
    ipfsHash: string;
    size: number;
    uploadedAt: string;
  };
  tier: string;
  timestamp: string;
}

export default function ProofProcessPage() {
  const [currentStep, setCurrentStep] = useState(() => {
    // Initialize from session storage if available, otherwise start at 0
    if (typeof window !== "undefined") {
      const savedStep = sessionStorage.getItem("proof_process_step");
      return savedStep ? parseInt(savedStep) : 0;
    }
    return 0;
  });
  const [isComplete, setIsComplete] = useState(false);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [error, setError] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);

  // ZKPassport related states
  const [zkPassportMessage, setZkPassportMessage] = useState("");
  const [queryUrl, setQueryUrl] = useState("");
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [onChainVerified, setOnChainVerified] = useState<boolean | undefined>(
    undefined
  );
  const [hyliVerified, setHyliVerified] = useState<boolean | undefined>(
    undefined
  );
  const [zkProofData, setZkProofData] = useState<ProofResult[]>([]);
  const [contractAddress, setContractAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [ipfsUploadResult, setIpfsUploadResult] = useState<UploadResult | null>(
    null
  );
  const [isUploadingToIPFS, setIsUploadingToIPFS] = useState(false);

  const zkPassportRef = useRef<ZKPassport | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const tier = searchParams.get("tier") || "anonymity";

  // Get wallet state from hyli-wallet
  const { wallet } = useWallet();

  // Define the new flow steps
  const flowSteps = [
    { name: "HYLI WALLET LOGIN", status: "pending" },
    { name: "ZKPASSPORT VERIFICATION", status: "pending" },
    { name: "ONCHAIN PROOF VERIFICATION", status: "pending" },
    { name: "VIDEO RECORDING", status: "pending" },
    { name: "STEGANOGRAPHIC PROCESSING", status: "pending" },
  ];

  const [steps, setSteps] = useState(flowSteps);

  // Custom setCurrentStep that persists to session storage
  const updateCurrentStep = (step: number) => {
    setCurrentStep(step);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("proof_process_step", step.toString());
    }
  };

  // Initialize ZKPassport
  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport(window.location.hostname);
    }

    return () => {
      if (zkPassportRef.current) {
        setRequestInProgress(false);
        setIsProcessing(false);
      }
    };
  }, []);

  // Initialize proof data - restore from session if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedProofData = sessionStorage.getItem("proof_data");
      if (savedProofData) {
        try {
          const parsedData = JSON.parse(savedProofData);
          console.log("Restored proof data from session:", parsedData);
          setProofData(parsedData);
          return;
        } catch (error) {
          console.error("Error parsing saved proof data:", error);
        }
      }
    }

    // If no saved data, initialize fresh
    setProofData({
      tier,
      timestamp: new Date().toISOString(),
    });
  }, [tier]);

  // Restore other state from session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedState = sessionStorage.getItem("proof_process_state");
      if (savedState) {
        try {
          const state = JSON.parse(savedState);
          console.log("Restoring saved state:", state);

          if (state.onChainVerified !== undefined)
            setOnChainVerified(state.onChainVerified);
          if (state.hyliVerified !== undefined)
            setHyliVerified(state.hyliVerified);
          if (state.zkProofData) setZkProofData(state.zkProofData);
          if (state.contractAddress) setContractAddress(state.contractAddress);
          if (state.txHash) setTxHash(state.txHash);
          if (state.ipfsUploadResult)
            setIpfsUploadResult(state.ipfsUploadResult);
        } catch (error) {
          console.error("Error restoring saved state:", error);
        }
      }
    }
  }, []);

  // Save state to session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const state = {
        onChainVerified,
        hyliVerified,
        zkProofData,
        contractAddress,
        txHash,
        ipfsUploadResult,
      };
      sessionStorage.setItem("proof_process_state", JSON.stringify(state));
    }
  }, [
    onChainVerified,
    hyliVerified,
    zkProofData,
    contractAddress,
    txHash,
    ipfsUploadResult,
  ]);

  // Watch for wallet connection and auto-proceed to step 1 (only if not returning from camera)
  useEffect(() => {
    const fromCamera = searchParams.get("from") === "camera";
    const hasRecordedVideo = sessionStorage.getItem("recorded_video");

    // Only auto-login if we're at step 0, have a wallet, not coming from camera, and don't have recorded video
    if (wallet && currentStep === 0 && !fromCamera && !hasRecordedVideo) {
      handleHyliLogin();
    }
  }, [wallet, searchParams, currentStep]);

  // Step 1: Hyli Wallet Login
  const handleHyliLogin = () => {
    if (wallet) {
      setProofData((prev) => ({
        ...prev!,
        hyliWallet: {
          address: wallet.address,
          connectedAt: new Date().toISOString(),
        },
      }));

      // Mark step as completed
      setSteps((prev) =>
        prev.map((step, idx) =>
          idx === 0 ? { ...step, status: "completed" } : step
        )
      );

      updateCurrentStep(1);
      setShowWalletConnect(false);
    } else {
      setShowWalletConnect(true);
    }
  };

  // Reset ZKPassport state
  const resetZKPassportState = () => {
    setZkPassportMessage("");
    setQueryUrl("");
    setOnChainVerified(undefined);
    setHyliVerified(undefined);
    setZkProofData([]);
    setContractAddress("");
    setTxHash("");
    setRequestInProgress(false);
  };

  // Step 2: ZKPassport Verification
  const handleZKPassportVerification = async () => {
    if (!zkPassportRef.current) {
      setError("ZKPassport not initialized");
      return;
    }

    if (!wallet?.address) {
      setError("Please connect your wallet first");
      return;
    }

    if (requestInProgress || isProcessing) {
      setZkPassportMessage("Request already in progress, please wait...");
      return;
    }

    resetZKPassportState();
    setIsProcessing(true);

    try {
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
      setZkPassportMessage("Scan the QR code with your ZKPassport mobile app");
      setRequestInProgress(true);

      onRequestReceived(() => {
        console.log("QR code scanned");
        setZkPassportMessage("Request received - generating proof...");
      });

      onGeneratingProof(() => {
        console.log("Generating proof");
        setZkPassportMessage("Generating zero-knowledge proof...");
      });

      const proofs: ProofResult[] = [];

      onProofGenerated(async (proof: ProofResult) => {
        console.log("Proof result", proof);
        proofs.push(proof);
        setZkProofData([...proofs]);
        setZkPassportMessage("Proof generated - uploading to IPFS...");

        // Upload proof to IPFS immediately after generation
        const proofDataForIPFS = {
          ...proof,
          wallet_address: wallet?.address,
          timestamp: new Date().toISOString(),
          tier: tier,
          app: "TruthSeeker",
        };

        await uploadProofToIPFS_Action(proofDataForIPFS);
        setZkPassportMessage(
          "Proof uploaded to IPFS - verifying on Ethereum..."
        );
        setRequestInProgress(false);

        try {
          // Verify on Ethereum
          const params = zkPassportRef.current!.getSolidityVerifierParameters({
            proof,
            scope: "adult",
            devMode: true,
          });

          const { address, abi, functionName } =
            zkPassportRef.current!.getSolidityVerifierDetails(
              "ethereum_sepolia"
            );

          setContractAddress(address);

          const publicClient = createPublicClient({
            chain: sepolia,
            transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
          });

          const contractCallResult = await publicClient.readContract({
            address,
            abi,
            functionName,
            args: [params],
          });

          const isVerified = Array.isArray(contractCallResult)
            ? Boolean(contractCallResult[0])
            : false;

          setOnChainVerified(isVerified);

          if (isVerified) {
            setZkPassportMessage("Ethereum verification successful!");

            // Update proof data with successful verification
            setProofData((prev) => ({
              ...prev!,
              zkPassport: {
                verified: true,
                nullifier: JSON.stringify(proof).slice(0, 32) + "...",
                timestamp: new Date().toISOString(),
                proofResult: proof,
                queryUrl: url,
              },
            }));

            // Mark step as completed
            setSteps((prev) =>
              prev.map((step, idx) =>
                idx === 1 ? { ...step, status: "completed" } : step
              )
            );

            updateCurrentStep(2);
          } else {
            throw new Error("Ethereum verification failed");
          }
        } catch (verificationError) {
          console.error("Error during verification:", verificationError);
          setError("Verification failed");
          setOnChainVerified(false);
        }
      });

      onResult(
        async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
          console.log("Final verification result:", verified);
          console.log("Unique identifier:", uniqueIdentifier);
          if (verified && uniqueIdentifier) {
            // Update proof data with unique identifier
            setProofData((prev) => ({
              ...prev!,
              zkPassport: {
                ...prev!.zkPassport!,
                nullifier: uniqueIdentifier,
              },
            }));
            setZkPassportMessage("ZKPassport verification complete!");
          }
        }
      );

      onReject(() => {
        console.log("User rejected");
        setZkPassportMessage("User rejected the request");
        setRequestInProgress(false);
        setError("User rejected the verification request");
      });

      onError((error: unknown) => {
        console.error("ZKPassport Error", error);
        setZkPassportMessage("An error occurred during verification");
        setRequestInProgress(false);
        setError("ZKPassport verification error");
      });
    } catch (err) {
      console.error("Error creating ZKPassport request:", err);
      setError("Failed to create verification request");
    } finally {
      setIsProcessing(false);
    }
  };

  // Upload proof data to IPFS via client-side (same as pinata-test)
  const uploadProofToIPFS_Action = async (proofData: any) => {
    setIsUploadingToIPFS(true);
    try {
      // Use the same client-side upload that works in pinata-test
      const result = await uploadProofToIPFS(proofData);
      setIpfsUploadResult(result);

      if (result.success && result.cid) {
        setProofData((prev) => ({
          ...prev!,
          ipfsUpload: {
            cid: result.cid!,
            ipfsHash: result.ipfsHash!,
            size: result.size!,
            uploadedAt: new Date().toISOString(),
          },
        }));
      }

      return result;
    } catch (error) {
      console.error("Error uploading to IPFS:", error);
      const errorResult = { success: false, error: "Upload failed" };
      setIpfsUploadResult(errorResult);
      return errorResult;
    } finally {
      setIsUploadingToIPFS(false);
    }
  };

  // Submit to Hyli Network
  const submitToHyliNetwork = async (
    proof: ProofResult,
    userAddress: string
  ) => {
    try {
      const zkPassportAction = {
        VerifyIdentity: {
          proof: {
            proof: proof.proof || "",
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

      const blob = {
        contract_name: "zkpassport",
        data: zkPassportAction,
      };

      const baseUrl =
        process.env.NEXT_PUBLIC_SERVER_BASE_URL || "http://localhost:4002";
      const headers = new Headers();
      headers.append("content-type", "application/json");
      headers.append("x-user", `${userAddress}@zkpassport`);

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

      if (result.tx_hash) {
        try {
          await contractService.pollTransactionStatus(result.tx_hash);
          return result;
        } catch (error) {
          console.warn("Transaction polling failed:", error);
          return result;
        }
      }

      return result;
    } catch (error) {
      console.error("Error submitting to Hyli network:", error);
      setHyliVerified(false);
      throw error;
    }
  };

  // Step 3: Onchain Proof Verification
  const handleOnchainVerification = async () => {
    if (!wallet?.address || !zkProofData.length) {
      setError("Missing wallet or proof data");
      return;
    }

    setIsProcessing(true);
    setZkPassportMessage("Submitting to Hyli network...");

    try {
      const proof = zkProofData[0];
      const result = await submitToHyliNetwork(proof, wallet.address);

      setProofData((prev) => ({
        ...prev!,
        onchainProof: {
          verified: true,
          transactionHash: result.tx_hash || "",
          timestamp: new Date().toISOString(),
          contractAddress: contractAddress,
          hyliTxHash: result.tx_hash,
        },
      }));

      // Mark step as completed
      setSteps((prev) =>
        prev.map((step, idx) =>
          idx === 2 ? { ...step, status: "completed" } : step
        )
      );

      setZkPassportMessage("Successfully verified on Hyli network!");
      updateCurrentStep(3);
    } catch (error) {
      console.error("Onchain verification failed:", error);
      setError("Failed to verify proof on Hyli network");
    } finally {
      setIsProcessing(false);
    }
  };

  // Save proof data to session storage whenever it changes
  useEffect(() => {
    if (proofData && typeof window !== "undefined") {
      sessionStorage.setItem("proof_data", JSON.stringify(proofData));
    }
  }, [proofData]);

  // Step 4: Navigate to Camera Page
  const handleNavigateToCamera = () => {
    // Only allow navigation if onchain proof is verified
    if (!proofData?.onchainProof?.verified) {
      setError("Onchain verification not completed yet");
      return;
    }

    // Store proof data in session storage for camera page
    sessionStorage.setItem("proof_data", JSON.stringify(proofData));
    router.push(`/camera?tier=${tier}&from=proof-process`);
  };

  // Step 5: Handle video from camera and create steganographic video
  useEffect(() => {
    // Check if we're returning from camera page with recorded video
    const recordedVideo = sessionStorage.getItem("recorded_video");
    const fromCamera = searchParams.get("from") === "camera";

    console.log("Camera return check:", {
      recordedVideo: !!recordedVideo,
      fromCamera,
      onchainVerified: proofData?.onchainProof?.verified,
      currentStep,
      proofData: proofData,
    });

    // Only proceed if we have verified onchain proof and coming from camera
    if (recordedVideo && fromCamera && proofData?.onchainProof?.verified) {
      console.log("Proceeding to step 4 (steganographic processing)");

      // Mark video recording step as completed and move to steganographic processing
      setSteps((prev) =>
        prev.map((step, idx) =>
          idx === 3 ? { ...step, status: "completed" } : step
        )
      );
      updateCurrentStep(4);

      // Clear the from parameter to prevent re-triggering
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("from");
      window.history.replaceState({}, "", newUrl.toString());
    } else if (recordedVideo && fromCamera) {
      console.log(
        "Camera return but missing onchain verification - forcing step 4 anyway"
      );
      updateCurrentStep(4);

      // Clear the from parameter to prevent re-triggering
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("from");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, [searchParams, proofData, currentStep]);

  // Step 5: Steganographic Processing
  const handleSteganographicProcessing = async () => {
    const recordedVideo = sessionStorage.getItem("recorded_video");
    if (!recordedVideo) {
      setError("No recorded video found");
      return;
    }

    // Get the IPFS CID to embed
    const ipfsCid = proofData?.ipfsUpload?.cid || ipfsUploadResult?.cid;
    if (!ipfsCid) {
      setError("No IPFS CID available for embedding");
      return;
    }

    setIsProcessing(true);

    try {
      // Convert base64 video back to blob
      const response = await fetch(recordedVideo);
      const videoBlob = await response.blob();

      // Create File object from blob
      const videoFile = new File([videoBlob], "recorded_video.mp4", {
        type: "video/mp4",
      });

      // Call backend service to encrypt (this returns JSON with base64 video)
      const result = await backendService.encryptVideo(videoFile, ipfsCid);

      if (result.mp4) {
        // Convert base64 back to blob URL for preview and download
        const processedBlob = new Blob(
          [Uint8Array.from(atob(result.mp4), (c) => c.charCodeAt(0))],
          { type: "video/mp4" }
        );

        const downloadUrl = URL.createObjectURL(processedBlob);

        setProofData((prev) => ({
          ...prev!,
          steganographicVideo: {
            processed: true,
            downloadUrl: downloadUrl,
            timestamp: new Date().toISOString(),
          },
        }));

        // Mark step as completed
        setSteps((prev) =>
          prev.map((step, idx) =>
            idx === 4 ? { ...step, status: "completed" } : step
          )
        );

        // Complete the entire process
        setIsComplete(true);

        // Clean up session storage
        sessionStorage.removeItem("recorded_video");
        sessionStorage.removeItem("proof_data");
        sessionStorage.removeItem("proof_process_step");
        sessionStorage.removeItem("proof_process_state");
      }
    } catch (error) {
      console.error("Steganographic processing failed:", error);
      setError("Failed to process video with steganographic embedding");
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentStepAction = () => {
    switch (currentStep) {
      case 0:
        return wallet ? (
          <Button
            onClick={handleHyliLogin}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase border-4 border-black"
          >
            PROCEED WITH CONNECTED WALLET
          </Button>
        ) : (
          <Button
            onClick={handleHyliLogin}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase border-4 border-black"
          >
            LOGIN WITH HYLI WALLET
          </Button>
        );
      case 1:
        return (
          <Button
            onClick={handleZKPassportVerification}
            disabled={isProcessing || requestInProgress}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold uppercase border-4 border-black"
          >
            {isProcessing || requestInProgress
              ? "PROCESSING..."
              : "START ZKPASSPORT VERIFICATION"}
          </Button>
        );
      case 2:
        return (
          <Button
            onClick={handleOnchainVerification}
            disabled={isProcessing || !onChainVerified}
            className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold uppercase border-4 border-black"
          >
            {isProcessing ? "VERIFYING ONCHAIN..." : "VERIFY PROOF ONCHAIN"}
          </Button>
        );
      case 3:
        return (
          <Button
            onClick={handleNavigateToCamera}
            disabled={!proofData?.onchainProof?.verified}
            className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white font-bold uppercase border-4 border-black disabled:opacity-50 disabled:cursor-not-allowed"
          >
            📹 RECORD VIDEO
          </Button>
        );
      case 4:
        return (
          <Button
            onClick={handleSteganographicProcessing}
            disabled={isProcessing}
            className="px-8 py-4 bg-pink-600 hover:bg-pink-700 text-white font-bold uppercase border-4 border-black"
          >
            {isProcessing ? "PROCESSING..." : "CREATE STEGANOGRAPHIC VIDEO"}
          </Button>
        );
      default:
        return null;
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 0:
        return "Connect your Hyli wallet to begin the verification process. This establishes your identity for the proof.";
      case 1:
        return "Verify your humanity using ZKPassport zero-knowledge proofs. Scan the QR code with your mobile device.";
      case 2:
        return "Submit and verify your proof on the blockchain. This creates an immutable record of your verification.";
      case 3:
        return "Record your video content with the integrated camera. The proof will be embedded in this recording.";
      case 4:
        const ipfsInfo = proofData?.ipfsUpload || ipfsUploadResult;
        const ipfsText = ipfsInfo?.cid
          ? `Your proof is stored on IPFS: ${ipfsInfo.cid}`
          : "Proof data available for embedding";
        return `Process your video with steganographic techniques to embed the IPFS CID invisibly. ${ipfsText}`;
      default:
        return "";
    }
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 0:
        return "🔐";
      case 1:
        return "📱";
      case 2:
        return "⛓️";
      case 3:
        return "📹";
      case 4:
        return "🎨";
      default:
        return "✅";
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
            <div className="flex justify-center items-center space-x-2 overflow-x-auto">
              {steps.map((step, idx) => (
                <div key={idx} className="flex items-center flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full border-4 flex items-center justify-center font-bold text-sm ${
                      step.status === "completed"
                        ? "bg-green-500 border-green-500 text-white"
                        : idx === currentStep
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-gray-300 border-gray-300 text-gray-600"
                    }`}
                  >
                    {step.status === "completed" ? "✓" : idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-8 h-1 ${
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
                <div className="text-6xl mb-4">{getStepIcon()}</div>

                <div className="space-y-4">
                  <h2 className="text-2xl font-bold uppercase">
                    {steps[currentStep]?.name}
                  </h2>

                  <p className="font-mono text-sm">{getStepDescription()}</p>

                  {/* Step-specific content */}
                  {currentStep === 0 && wallet && (
                    <div className="bg-green-100 border-2 border-green-500 text-green-700 p-4 font-mono text-sm">
                      ✅ Wallet Connected: {wallet.address.slice(0, 8)}...
                      {wallet.address.slice(-6)}
                    </div>
                  )}

                  {/* ZKPassport QR Code */}
                  {currentStep === 1 && queryUrl && (
                    <div className="space-y-4">
                      <div className="inline-block p-6 bg-white rounded-lg border-2 border-gray-300">
                        <QRCode value={queryUrl} size={200} />
                      </div>
                      <p className="text-sm text-gray-600">
                        Use your ZKPassport mobile app to scan this QR code
                      </p>
                    </div>
                  )}

                  {/* ZKPassport Status Messages */}
                  {currentStep === 1 && zkPassportMessage && (
                    <div className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-4 font-mono text-sm">
                      {zkPassportMessage}
                    </div>
                  )}

                  {currentStep === 1 &&
                    zkProofData.length > 0 &&
                    !onChainVerified && (
                      <div className="bg-yellow-100 border-2 border-yellow-500 text-yellow-700 p-4 font-mono text-sm space-y-2">
                        <div className="font-bold">
                          ⚡ PROOF GENERATED - VERIFYING...
                        </div>
                        <div className="text-xs">
                          Zero-knowledge proof generated successfully. Verifying
                          on Ethereum blockchain...
                        </div>
                      </div>
                    )}

                  {currentStep === 1 && onChainVerified && (
                    <div className="bg-green-100 border-2 border-green-500 text-green-700 p-4 font-mono text-sm space-y-2">
                      <div className="font-bold">
                        ✅ ZKPassport Verified on Ethereum
                      </div>
                      <div className="bg-white p-2 rounded border text-xs">
                        <div>
                          <strong>Contract:</strong>{" "}
                          {contractAddress.slice(0, 8)}...
                          {contractAddress.slice(-6)}
                        </div>
                        <div>
                          <strong>Verification:</strong> Age ≥ 18 ✅
                        </div>
                        <div>
                          <strong>Proof:</strong> Zero-Knowledge
                        </div>
                      </div>
                      <div className="text-xs text-green-600">
                        Ready to proceed to onchain verification
                      </div>
                    </div>
                  )}

                  {currentStep === 2 &&
                    (onChainVerified || zkProofData.length > 0) && (
                      <div className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-4 font-mono text-sm space-y-3">
                        <div className="font-bold">
                          🔍 COMPLETE PROOF DETAILS
                        </div>

                        {/* Basic Verification Info */}
                        <div className="bg-white p-3 rounded border text-xs space-y-2">
                          <div className="font-bold text-blue-800 border-b pb-1">
                            VERIFICATION STATUS
                          </div>
                          <div>
                            <strong>Over 18:</strong> ✅ Yes
                          </div>
                          <div>
                            <strong>Unique Identifier:</strong>{" "}
                            {proofData?.zkPassport?.nullifier ||
                              "Generating..."}
                          </div>
                          <div>
                            <strong>Verified:</strong> ✅ Yes
                          </div>
                          <div>
                            <strong>On-chain Verified:</strong>{" "}
                            {onChainVerified ? "✅ Yes" : "⏳ Pending"}
                          </div>
                          <div>
                            <strong>Verifier Contract:</strong>{" "}
                            {contractAddress || "Loading..."}
                          </div>
                          <div>
                            <strong>IPFS Storage:</strong>{" "}
                            {isUploadingToIPFS ? (
                              "🔄 Uploading..."
                            ) : ipfsUploadResult?.success ? (
                              <span className="text-green-600">✅ Stored</span>
                            ) : (
                              "⏳ Pending"
                            )}
                          </div>
                        </div>

                        {/* IPFS Details */}
                        {(ipfsUploadResult?.success ||
                          proofData?.ipfsUpload) && (
                          <div className="bg-green-50 p-3 rounded border border-green-200 text-xs space-y-2">
                            <div className="font-bold text-green-800 border-b border-green-200 pb-1">
                              📦 IPFS STORAGE DETAILS
                            </div>
                            <div>
                              <strong>CID:</strong>{" "}
                              <span className="font-mono bg-green-100 px-1 rounded">
                                {proofData?.ipfsUpload?.cid ||
                                  ipfsUploadResult?.cid}
                              </span>
                            </div>
                            {(ipfsUploadResult?.gatewayUrl ||
                              proofData?.ipfsUpload?.cid) && (
                              <div>
                                <strong>IPFS Link:</strong>{" "}
                                <a
                                  href={
                                    ipfsUploadResult?.gatewayUrl ||
                                    `https://blush-acceptable-bandicoot-493.mypinata.cloud/ipfs/${proofData?.ipfsUpload?.cid}`
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline text-xs break-all"
                                >
                                  View on IPFS ↗
                                </a>
                              </div>
                            )}
                            <div>
                              <strong>Size:</strong>{" "}
                              {proofData?.ipfsUpload?.size ||
                                ipfsUploadResult?.size}{" "}
                              bytes
                            </div>
                            <div>
                              <strong>Uploaded:</strong>{" "}
                              {proofData?.ipfsUpload?.uploadedAt
                                ? new Date(
                                    proofData.ipfsUpload.uploadedAt
                                  ).toLocaleString()
                                : "Just now"}
                            </div>
                            <div className="text-xs text-green-600 font-bold">
                              🌐 Proof data permanently stored on IPFS network
                            </div>
                          </div>
                        )}

                        {/* Detailed Proof Data */}
                        {zkProofData.length > 0 && (
                          <div className="bg-white p-3 rounded border text-xs space-y-2">
                            <div className="font-bold text-blue-800 border-b pb-1">
                              GENERATED PROOF DATA
                            </div>
                            <div>
                              <strong>Proof Name:</strong>{" "}
                              {zkProofData[0]?.name || "outer_evm_count_5"}
                            </div>
                            <div>
                              <strong>Version:</strong>{" "}
                              {zkProofData[0]?.version || "0.4.3"}
                            </div>
                            <div>
                              <strong>VKey Hash:</strong>{" "}
                              {zkProofData[0]?.vkeyHash
                                ? `${zkProofData[0].vkeyHash.slice(
                                    0,
                                    10
                                  )}...${zkProofData[0].vkeyHash.slice(-8)}`
                                : "Generating..."}
                            </div>

                            {/* Committed Inputs */}
                            {zkProofData[0]?.committedInputs && (
                              <div className="mt-2">
                                <div className="font-bold text-blue-800">
                                  Committed Inputs:
                                </div>
                                <div className="ml-2 text-xs bg-gray-50 p-2 rounded">
                                  <div>
                                    <strong>Type:</strong> Age Verification
                                    (≥18)
                                  </div>
                                  <div>
                                    <strong>Scope:</strong> Adult
                                  </div>
                                  <div>
                                    <strong>Mode:</strong> Compressed EVM
                                  </div>
                                  <div>
                                    <strong>Chain:</strong> Ethereum Sepolia
                                  </div>
                                  <div>
                                    <strong>Bound User:</strong>{" "}
                                    {wallet?.address || "Connected Wallet"}
                                  </div>
                                  <div>
                                    <strong>Custom Data:</strong>{" "}
                                    email:test@test.com,customer_id:1234567890
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Proof Hash Preview */}
                            {zkProofData[0]?.proof && (
                              <div className="mt-2">
                                <div className="font-bold text-blue-800">
                                  Zero-Knowledge Proof:
                                </div>
                                <div className="bg-gray-100 p-2 rounded text-xs">
                                  <div className="font-mono break-all">
                                    {zkProofData[0].proof.slice(0, 80)}...
                                  </div>
                                  <div className="text-gray-500 mt-1 flex justify-between items-center">
                                    <span>
                                      ({zkProofData[0].proof.length} characters
                                      total)
                                    </span>
                                    <details className="cursor-pointer">
                                      <summary className="text-blue-600 hover:text-blue-800">
                                        View Full Proof
                                      </summary>
                                      <div className="mt-2 max-h-40 overflow-y-auto bg-white p-2 rounded border font-mono text-xs break-all">
                                        {zkProofData[0].proof}
                                      </div>
                                    </details>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Full JSON Data for Developers */}
                            <details className="mt-2">
                              <summary className="font-bold text-blue-800 cursor-pointer hover:text-blue-600">
                                🔧 Raw Proof Data (Developer View)
                              </summary>
                              <div className="mt-2 bg-gray-100 p-2 rounded text-xs max-h-60 overflow-y-auto">
                                <pre className="font-mono whitespace-pre-wrap break-all">
                                  {JSON.stringify(zkProofData[0], null, 2)}
                                </pre>
                              </div>
                            </details>
                          </div>
                        )}

                        <div className="text-xs text-blue-600 font-bold">
                          {onChainVerified
                            ? "Ready for Hyli network submission"
                            : "Ready for onchain submission to Hyli network"}
                        </div>
                      </div>
                    )}

                  {currentStep === 2 && hyliVerified && (
                    <div className="bg-green-100 border-2 border-green-500 text-green-700 p-4 font-mono text-sm">
                      ✅ Proof Verified on Hyli Network
                      <br />
                      {txHash && (
                        <a
                          href={`https://explorer.hyli.org/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline hover:text-green-800"
                        >
                          Transaction: {txHash.slice(0, 16)}...
                        </a>
                      )}
                    </div>
                  )}

                  {currentStep === 4 &&
                    sessionStorage.getItem("recorded_video") && (
                      <div className="bg-green-100 border-2 border-green-500 text-green-700 p-4 font-mono text-sm">
                        ✅ Video Ready for Processing
                      </div>
                    )}

                  {currentStep === 4 && isProcessing && (
                    <div className="bg-blue-100 border-2 border-blue-500 text-blue-700 p-4 font-mono text-sm">
                      <div className="space-y-2">
                        <div>🔄 PROCESSING STEGANOGRAPHIC EMBEDDING...</div>
                        <div className="text-xs space-y-1">
                          <div>• Analyzing video frames...</div>
                          <div>
                            • Embedding IPFS CID:{" "}
                            {proofData?.ipfsUpload?.cid ||
                              ipfsUploadResult?.cid}
                          </div>
                          <div>• Applying LSB steganography...</div>
                          <div>• Finalizing encrypted video...</div>
                        </div>
                      </div>
                    </div>
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
                  Your steganographic video has been created with embedded
                  proofs.
                </p>

                {/* Video Preview Section */}
                {proofData?.steganographicVideo?.downloadUrl && (
                  <div className="space-y-4">
                    <div className="border-4 border-green-600 bg-white p-4">
                      <h3 className="font-bold uppercase mb-3 text-green-800">
                        🎥 STEGANOGRAPHIC VIDEO PREVIEW
                      </h3>
                      <video
                        src={proofData.steganographicVideo.downloadUrl}
                        controls
                        className="w-full max-w-2xl border-4 border-green-300 mx-auto"
                        preload="metadata"
                      />
                      <div className="mt-3 text-sm text-green-700">
                        <div>
                          <strong>Status:</strong> IPFS CID embedded with
                          steganography
                        </div>
                        <div>
                          <strong>Embedded Data:</strong>{" "}
                          {proofData?.ipfsUpload?.cid || ipfsUploadResult?.cid}
                        </div>
                        <div>
                          <strong>Processing Time:</strong>{" "}
                          {proofData.steganographicVideo.timestamp}
                        </div>
                      </div>
                    </div>

                    <div className="pt-4">
                      <a
                        href={proofData.steganographicVideo.downloadUrl}
                        download="truthseeker_verified_video.webm"
                        className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white font-bold uppercase border-4 border-black inline-block"
                      >
                        📥 DOWNLOAD VERIFIED VIDEO
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tier Information */}
          <div className="border-4 border-black bg-black text-white p-6">
            <h3 className="font-bold uppercase text-lg mb-4">
              TIER: {tier.toUpperCase()}
            </h3>
            <div className="font-mono text-sm space-y-2">
              <p>• Hyli wallet authentication</p>
              <p>• ZKPassport zero-knowledge verification</p>
              <p>• Onchain proof validation</p>
              <p>• Camera-recorded content</p>
              <p>• Steganographic proof embedding</p>
            </div>
          </div>
        </div>
      </main>

      {/* Hyli Wallet Connect Modal */}
      {showWalletConnect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg max-w-md w-full mx-4 border-4 border-black">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold uppercase mb-2">
                Connect Hyli Wallet
              </h3>
              <p className="font-mono text-sm text-gray-600">
                Sign in or create an account to continue
              </p>
            </div>

            <HyliWallet
              providers={["password", "google", "github"]}
              isOpen={showWalletConnect}
              onClose={() => setShowWalletConnect(false)}
            />

            <div className="mt-6 text-center">
              <button
                onClick={() => setShowWalletConnect(false)}
                className="text-sm text-gray-500 hover:text-gray-700 font-mono"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
