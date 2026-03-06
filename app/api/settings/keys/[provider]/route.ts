import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { providerTestMap } from "@/lib/providers";
import type { ProviderName } from "@/lib/providers";

export async function PUT(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider as ProviderName;
  const { apiKey } = await req.json();

  if (!apiKey || typeof apiKey !== "string") {
    return NextResponse.json({ error: "API key required" }, { status: 400 });
  }

  const { encrypted, iv, authTag } = encrypt(apiKey);

  let isValid = false;
  let error: string | undefined;
  try {
    const testFn = providerTestMap[provider];
    if (testFn) {
      isValid = await testFn(apiKey);
      if (!isValid) error = "Key authentication failed";
    }
  } catch (e) {
    error = e instanceof Error ? e.message : "Test failed";
  }

  await prisma.apiKey.upsert({
    where: { provider },
    create: { provider, encryptedKey: encrypted, iv, authTag, isValid, lastTestedAt: new Date() },
    update: { encryptedKey: encrypted, iv, authTag, isValid, lastTestedAt: new Date() },
  });

  return NextResponse.json({ provider, isValid, error });
}

export async function DELETE(_req: NextRequest, { params }: { params: { provider: string } }) {
  await prisma.apiKey.deleteMany({ where: { provider: params.provider } });
  return NextResponse.json({ ok: true });
}
