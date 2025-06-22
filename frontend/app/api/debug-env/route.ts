import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    hasPinataJWT: !!process.env.PINATA_JWT,
    hasPublicPinataJWT: !!process.env.NEXT_PUBLIC_PINATA_JWT,
    hasGatewayUrl: !!process.env.NEXT_PUBLIC_GATEWAY_URL,
    nodeEnv: process.env.NODE_ENV,
    // Don't expose actual values for security
    pinataJWTLength: process.env.PINATA_JWT?.length || 0,
    publicPinataJWTLength: process.env.NEXT_PUBLIC_PINATA_JWT?.length || 0,
  });
}
