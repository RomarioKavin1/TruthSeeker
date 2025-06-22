import { NextResponse, type NextRequest } from "next/server";
import { PinataSDK } from "pinata";

export async function POST(request: NextRequest) {
  try {
    console.log("Upload proof API called");

    const { proofData, type } = await request.json();
    console.log("Request data:", {
      type,
      proofDataKeys: Object.keys(proofData || {}),
    });

    if (!proofData || !type) {
      return NextResponse.json(
        { error: "Proof data and type are required" },
        { status: 400 }
      );
    }

    const PINATA_JWT =
      process.env.PINATA_JWT || process.env.NEXT_PUBLIC_PINATA_JWT;

    console.log("Environment check:", {
      hasPinataJWT: !!PINATA_JWT,
      hasGatewayUrl: !!process.env.NEXT_PUBLIC_GATEWAY_URL,
    });

    if (!PINATA_JWT) {
      console.error("Pinata JWT not found in environment variables");
      return NextResponse.json(
        { error: "Pinata JWT not configured" },
        { status: 500 }
      );
    }

    console.log("Creating Pinata SDK instance...");
    const pinata = new PinataSDK({
      pinataJwt: PINATA_JWT,
      pinataGateway: process.env.NEXT_PUBLIC_GATEWAY_URL,
    });
    console.log("Pinata SDK instance created successfully");

    // Create a JSON file from the proof data
    console.log("Creating JSON file from proof data...");
    const jsonString = JSON.stringify(proofData, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const fileName = `${type}-proof-${Date.now()}.json`;
    const file = new File([blob], fileName, {
      type: "application/json",
    });
    console.log("File created:", { fileName, size: file.size });

    // Upload to Pinata
    console.log("Starting Pinata upload...");
    const { cid } = await pinata.upload.public.file(file);
    console.log("Upload successful, CID:", cid);

    console.log("Converting CID to gateway URL...");
    const url = await pinata.gateways.public.convert(cid);
    console.log("Gateway URL generated:", url);

    return NextResponse.json(
      {
        cid,
        url,
        type,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("Pinata upload error:", e);

    // Log detailed error information
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
