export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAudit } from "@/lib/audit-runner";

export async function GET() {
  const audits = await prisma.audit.findMany({
    include: { brand: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(audits);
}

export async function POST(req: NextRequest) {
  const { brand, promptCount, providers } = await req.json();

  const totalPrompts = promptCount || 100;
  const scale = totalPrompts / 100;
  const categories: Record<string, number> = {
    Discovery: Math.round(20 * scale),
    Comparison: Math.round(15 * scale),
    Brand: Math.round(15 * scale),
    Location: Math.round(10 * scale),
    Experience: Math.round(15 * scale),
    Amenity: Math.round(10 * scale),
    Practical: Math.round(10 * scale),
    Dining: Math.round(5 * scale),
  };

  const brandRecord = await prisma.brand.create({
    data: {
      name: brand.name,
      website: brand.website || null,
      location: brand.location,
      category: brand.type || "",
      features: brand.features || "",
      competitors: brand.competitors || "",
      priceRange: brand.priceRange || null,
      brief: brand.brief,
    },
  });

  const audit = await prisma.audit.create({
    data: {
      brandId: brandRecord.id,
      status: "PENDING",
      config: { promptCount: totalPrompts, providers, categories },
    },
  });

  // Fire-and-forget: start the audit runner asynchronously
  runAudit(audit.id).catch((e) => {
    console.error("Audit runner failed:", e);
  });

  return NextResponse.json({ auditId: audit.id, brandId: brandRecord.id });
}
