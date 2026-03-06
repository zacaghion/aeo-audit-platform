import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { PROVIDERS } from "@/lib/providers";

export async function GET() {
  const keys = await prisma.apiKey.findMany();
  const result = PROVIDERS.map((p) => {
    const key = keys.find((k) => k.provider === p);
    return {
      provider: p,
      isConfigured: !!key,
      isValid: key?.isValid ?? false,
      lastTestedAt: key?.lastTestedAt?.toISOString() ?? null,
    };
  });
  return NextResponse.json(result);
}
