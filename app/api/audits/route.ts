export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const audits = await prisma.audit.findMany({
    include: { hotel: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(audits);
}

export async function POST(req: NextRequest) {
  const { hotel, promptCount, providers } = await req.json();

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
      config: {
        promptCount,
        providers,
        categories: {
          Discovery: 20,
          Comparison: 15,
          Brand: 15,
          Location: 10,
          Experience: 15,
          Amenity: 10,
          Practical: 10,
          Dining: 5,
        },
      },
    },
  });

  return NextResponse.json({ auditId: audit.id, hotelId: hotelRecord.id });
}
