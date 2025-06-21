import { useEffect, useRef, useState } from "react";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import QRCode from "react-qr-code";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { useWallet } from "hyli-wallet";

interface ZKPassportVerificationProps {
  onVerificationComplete?: (
    verified: boolean,
    uniqueIdentifier: string,
    proofData: ProofResult[]
  ) => void;
}

export default function ZKPassportVerification({
  onVerificationComplete,
}: ZKPassportVerificationProps) {
  const { wallet } = useWallet();
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
  const zkPassportRef = useRef<ZKPassport | null>(null);

  useEffect(() => {
    if (!zkPassportRef.current) {
      zkPassportRef.current = new ZKPassport(window.location.hostname);
    }
  }, []);

  const submitToHyliNetwork = async (
    proof: ProofResult,
    userAddress: string
  ) => {
    try {
      setLoading(true);
      setMessage("Submitting verification to Hyli network...");

      // Prepare the zkpassport action for Hyli
      const zkPassportAction = {
        VerifyIdentity: {
          proof: {
            proof: proof.proof,
            vkey_hash: proof.vkeyHash || "",
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
      const blob = {
        contract_name: "zkpassport",
        data: JSON.stringify(zkPassportAction),
      };

      const headers = new Headers();
      headers.append("content-type", "application/json");
      headers.append("x-user", userAddress);
      headers.append("x-session-key", "zkpassport-session");
      headers.append("x-request-signature", "zkpassport-signature");

      const response = await fetch(
        `${import.meta.env.VITE_SERVER_BASE_URL}/api/zkpassport/verify`,
        {
          method: "POST",
          headers: headers,
          body: JSON.stringify({ blob }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hyli verification failed: ${errorText}`);
      }

      const result = await response.json();
      setHyliVerified(true);
      setMessage("Successfully verified on Hyli network!");

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

    setMessage("");
    setQueryUrl("");
    setIsOver18(undefined);
    setUniqueIdentifier("");
    setVerified(undefined);
    setOnChainVerified(undefined);
    setHyliVerified(undefined);
    setProofData([]);
    setContractAddress("");

    const queryBuilder = await zkPassportRef.current.request({
      name: "TruthSeeker ZKPassport",
      logo: "https://zkpassport.id/favicon.png",
      purpose: "Proof of adulthood for TruthSeeker platform",
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
      .bind("user_address", wallet.address)
      .bind(
        "custom_data",
        `hyli_address:${wallet.address},platform:truthseeker`
      )
      .done();

    setQueryUrl(url);
    console.log("ZKPassport verification URL:", url);

    setRequestInProgress(true);

    onRequestReceived(() => {
      console.log("QR code scanned");
      setMessage(
        "Request received - please complete verification on your device"
      );
    });

    onGeneratingProof(() => {
      console.log("Generating proof");
      setMessage("Generating zero-knowledge proof...");
    });

    const proofs: ProofResult[] = [];

    onProofGenerated(async (proof: ProofResult) => {
      console.log("Proof result", proof);
      proofs.push(proof);
      setProofData([...proofs]);
      setMessage("Proof generated - verifying on-chain...");
      setRequestInProgress(false);

      if (!zkPassportRef.current) {
        return;
      }

      try {
        // Ethereum Sepolia verification
        const params = zkPassportRef.current.getSolidityVerifierParameters({
          proof,
          scope: "adult",
          devMode: true,
        });

        const { address, abi, functionName } =
          zkPassportRef.current.getSolidityVerifierDetails("ethereum_sepolia");

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

        console.log("Ethereum contract call result", contractCallResult);
        const isVerified = Array.isArray(contractCallResult)
          ? Boolean(contractCallResult[0])
          : false;
        const ethUniqueIdentifier = Array.isArray(contractCallResult)
          ? String(contractCallResult[1])
          : "";

        setOnChainVerified(isVerified);

        // If Ethereum verification is successful, submit to Hyli network
        if (isVerified && wallet?.address) {
          await submitToHyliNetwork(proof, wallet.address);
        }

        // Set the unique identifier from Ethereum verification
        setUniqueIdentifier(ethUniqueIdentifier);
      } catch (error) {
        console.error("Error in verification process:", error);
        setMessage(
          `Verification error: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    });

    onResult(
      async ({ result, uniqueIdentifier, verified, queryResultErrors }) => {
        console.log("Result of the query", result);
        console.log("Query result errors", queryResultErrors);
        setIsOver18(result?.age?.gte?.result);
        setMessage("Verification result received");
        if (uniqueIdentifier) setUniqueIdentifier(uniqueIdentifier);
        setVerified(verified);
        setRequestInProgress(false);

        // Call the callback with verification results
        if (onVerificationComplete) {
          onVerificationComplete(
            verified || false,
            uniqueIdentifier || "",
            proofs
          );
        }
      }
    );

    onReject(() => {
      console.log("User rejected");
      setMessage("User rejected the verification request");
      setRequestInProgress(false);
    });

    onError((error: unknown) => {
      console.error("Error", error);
      setMessage("An error occurred during verification");
      setRequestInProgress(false);
    });
  };

  return (
    <div className="zkpassport-verification">
      <div className="zkpassport-header">
        <h2>ZK Passport Verification</h2>
        <p>Verify your identity using zero-knowledge proofs</p>
      </div>

      {!wallet?.address && (
        <div className="warning-message">
          Please connect your wallet to proceed with verification
        </div>
      )}

      {queryUrl && (
        <div className="qr-code-section">
          <p>Scan this QR code with your ZKPassport mobile app:</p>
          <QRCode value={queryUrl} size={200} />
        </div>
      )}

      {message && (
        <div className={`message ${loading ? "loading" : ""}`}>
          {loading && <span className="spinner">⏳</span>}
          {message}
        </div>
      )}

      {typeof isOver18 === "boolean" && (
        <div className="verification-result">
          <strong>Age Verification:</strong>{" "}
          {isOver18 ? "✅ Over 18" : "❌ Under 18"}
        </div>
      )}

      {uniqueIdentifier && (
        <div className="unique-id">
          <strong>Unique Identifier:</strong>
          <code>{uniqueIdentifier}</code>
        </div>
      )}

      <div className="verification-status">
        {verified !== undefined && (
          <div className={`status-item ${verified ? "success" : "failure"}`}>
            <strong>ZK Verification:</strong>{" "}
            {verified ? "✅ Verified" : "❌ Failed"}
          </div>
        )}

        {onChainVerified !== undefined && (
          <div
            className={`status-item ${onChainVerified ? "success" : "failure"}`}
          >
            <strong>Ethereum On-chain:</strong>{" "}
            {onChainVerified ? "✅ Verified" : "❌ Failed"}
          </div>
        )}

        {hyliVerified !== undefined && (
          <div
            className={`status-item ${hyliVerified ? "success" : "failure"}`}
          >
            <strong>Hyli Network:</strong>{" "}
            {hyliVerified ? "✅ Verified" : "❌ Failed"}
          </div>
        )}
      </div>

      {contractAddress && (
        <div className="contract-info">
          <strong>Verifier Contract:</strong>
          <a
            href={`https://sepolia.etherscan.io/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {contractAddress}
          </a>
        </div>
      )}

      {proofData.length > 0 && (
        <div className="proof-data">
          <h3>Generated Proofs:</h3>
          {proofData.map((proof, index) => (
            <details key={index} className="proof-details">
              <summary>Proof {index + 1}</summary>
              <pre>{JSON.stringify(proof, null, 2)}</pre>
            </details>
          ))}
        </div>
      )}

      {!requestInProgress && wallet?.address && (
        <button
          className="verify-button"
          onClick={createRequest}
          disabled={loading}
        >
          {loading ? "Processing..." : "Start ZK Verification"}
        </button>
      )}
    </div>
  );
}
