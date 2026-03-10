export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAudit } from "@/lib/audit-runner";
import { BUSINESS_PRESETS, type BusinessType } from "@/lib/business-presets";

function resolveBusinessType(typeStr: string): BusinessType {
  const lower = typeStr.toLowerCase();
  if (lower.includes("hotel") || lower.includes("hostel") || lower.includes("resort")) return "hotel";
  if (lower.includes("restaurant") || lower.includes("cafe") || lower.includes("bar") || lower.includes("food")) return "restaurant";
  if (lower.includes("saas") || lower.includes("software") || lower.includes("app") || lower.includes("platform")) return "saas";
  if (lower.includes("retail") || lower.includes("shop") || lower.includes("store")) return "retail";
  if (lower.includes("clinic") || lower.includes("medical") || lower.includes("dental")) return "clinic";
  if (lower.includes("gym") || lower.includes("fitness") || lower.includes("yoga")) return "fitness";
  return "other";
}

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
  const businessType = resolveBusinessType(brand.type || "other");
  const preset = BUSINESS_PRESETS[businessType];
  const categories: Record<string, number> = {};
  for (const [cat, count] of Object.entries(preset.categories)) {
    categories[cat] = Math.round(count * scale);
  }

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
