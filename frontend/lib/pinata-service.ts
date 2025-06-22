// Pinata service for uploading proof data to IPFS
export interface UploadResult {
  success: boolean;
  cid?: string;
  ipfsHash?: string;
  size?: number;
  error?: string;
  gatewayUrl?: string;
}

// Validate if a CID is properly formatted
export function isValidCID(cid: string): boolean {
  // Basic CID validation for v0 (Qm...) and v1
  const v0Pattern = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const v1Pattern = /^b[a-z2-7]{58}$/;
  return v0Pattern.test(cid) || v1Pattern.test(cid);
}

// Generate IPFS gateway URL for a CID
export function getIPFSUrl(cid: string, gatewayUrl?: string): string {
  const defaultGateway =
    gatewayUrl ||
    process.env.NEXT_PUBLIC_GATEWAY_URL ||
    "https://gateway.pinata.cloud";
  return `${defaultGateway}/ipfs/${cid}`;
}

export async function uploadProofToIPFS(proofData: any): Promise<UploadResult> {
  try {
    const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

    if (!PINATA_JWT) {
      console.warn("Pinata JWT not configured, using mock upload");
      return await uploadProofToIPFSMock(proofData);
    }

    // Use the latest Pinata SDK
    const { PinataSDK } = await import("pinata");

    const pinata = new PinataSDK({
      pinataJwt: PINATA_JWT,
      pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL,
    });

    // Create a JSON file from the proof data
    const jsonString = JSON.stringify(proofData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const file = new File([blob], `truthseeker-proof-${Date.now()}.json`, {
      type: "application/json",
    });

    // Upload using the latest SDK methods (exactly like frontendOld)
    const { cid } = await pinata.upload.public.file(file);
    console.log("Pinata upload successful:", { cid });

    // Validate the returned CID
    if (!isValidCID(cid)) {
      throw new Error(`Invalid CID returned from Pinata: ${cid}`);
    }

    // Generate gateway URL using the public gateway method
    const gatewayUrl = await pinata.gateways.public.convert(cid);

    return {
      success: true,
      cid: cid,
      ipfsHash: cid,
      size: 0, // Size not returned by this method
      gatewayUrl: gatewayUrl,
    };
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}

// Mock implementation for development/testing
async function uploadProofToIPFSMock(proofData: any): Promise<UploadResult> {
  const mockCid = generateMockCID();
  const proofSize = JSON.stringify(proofData).length;

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    success: true,
    cid: mockCid,
    ipfsHash: mockCid,
    size: proofSize,
  };
}

// Generate a realistic looking CID for demonstration
function generateMockCID(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "Qm";
  for (let i = 0; i < 44; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Legacy function - keeping for compatibility
export async function uploadProofToIPFSReal(
  proofData: any
): Promise<UploadResult> {
  try {
    const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;

    if (!PINATA_JWT) {
      throw new Error("Pinata JWT not configured");
    }

    const formData = new FormData();
    const jsonString = JSON.stringify(proofData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    formData.append("file", blob, `truthseeker-proof-${Date.now()}.json`);
    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: `TruthSeeker Proof ${Date.now()}`,
        keyValues: {
          type: "zkpassport-proof",
          timestamp: new Date().toISOString(),
          wallet_address: proofData.wallet_address || "unknown",
        },
      })
    );

    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${PINATA_JWT}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    return {
      success: true,
      cid: result.IpfsHash,
      ipfsHash: result.IpfsHash,
      size: result.PinSize,
    };
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    };
  }
}
