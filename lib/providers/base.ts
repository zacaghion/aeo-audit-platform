import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function getApiKey(provider: string): Promise<string | null> {
  const record = await prisma.apiKey.findUnique({ where: { provider } });
  if (!record || !record.isValid) return null;
  return decrypt(record.encryptedKey, record.iv, record.authTag);
}
