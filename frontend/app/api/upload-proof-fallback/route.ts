import { NextResponse, type NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("Upload proof fallback API called");

    const { proofData, type } = await request.json();

    if (!proofData || !type) {
      return NextResponse.json(
        { error: "Proof data and type are required" },
        { status: 400 }
      );
    }

    const PINATA_JWT =
      process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;

    if (!PINATA_JWT) {
      console.error("Pinata JWT not found in environment variables");
      return NextResponse.json(
        { error: "Pinata JWT not configured" },
        { status: 500 }
      );
    }

    // Use the old REST API approach as fallback
    const formData = new FormData();
    const jsonString = JSON.stringify(proofData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const fileName = `${type}-proof-${Date.now()}.json`;

    formData.append("file", blob, fileName);
    formData.append(
      "pinataMetadata",
      JSON.stringify({
        name: `TruthSeeker ${type} Proof ${Date.now()}`,
        keyValues: {
          type: type,
          timestamp: new Date().toISOString(),
        },
      })
    );

    console.log("Uploading to Pinata via REST API...");
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
      const errorText = await response.text();
      console.error("Pinata API error:", errorText);
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Pinata upload successful:", result);

    const cid = result.IpfsHash;
    const gatewayUrl = process.env.NEXT_PUBLIC_GATEWAY_URL
      ? `${process.env.NEXT_PUBLIC_GATEWAY_URL}/ipfs/${cid}`
      : `https://gateway.pinata.cloud/ipfs/${cid}`;

    return NextResponse.json(
      {
        cid,
        url: gatewayUrl,
        type,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Pinata upload error:", e);

    if (e instanceof Error) {
      console.error("Error message:", e.message);
      console.error("Error stack:", e.stack);
    }

    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
