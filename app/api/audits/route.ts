export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { runAudit } from "@/lib/audit-runner";

export async function GET() {
  const audits = await prisma.audit.findMany({
    include: { hotel: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(audits);
}

export async function POST(req: NextRequest) {
  const { hotel, promptCount, providers } = await req.json();

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

  const hotelRecord = await prisma.hotel.create({
    data: {
      name: hotel.name,
      website: hotel.website || null,
      location: hotel.location,
      type: hotel.type || "",
      features: hotel.features || "",
      competitors: hotel.competitors || "",
      priceRange: hotel.priceRange || null,
      brief: hotel.brief,
    },
  });

  const audit = await prisma.audit.create({
    data: {
      hotelId: hotelRecord.id,
      status: "PENDING",
      config: { promptCount: totalPrompts, providers, categories },
    },
  });

  // Fire-and-forget: start the audit runner asynchronously
  runAudit(audit.id).catch((e) => {
    console.error("Audit runner failed:", e);
  });

  return NextResponse.json({ auditId: audit.id, hotelId: hotelRecord.id });
}
