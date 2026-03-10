const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    const audits = await prisma.audit.findMany({
      where: { slug: null },
      include: { brand: true },
    });

    if (audits.length === 0) {
      console.log("No audits need slug backfill");
      return;
    }

    for (const audit of audits) {
      const name = audit.brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const d = audit.createdAt;
      const date = `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
      let base = `${name}-${date}`;
      let slug = base;
      let suffix = 2;

      while (await prisma.audit.findFirst({ where: { slug } })) {
        slug = `${base}-${suffix}`;
        suffix++;
      }

      await prisma.audit.update({ where: { id: audit.id }, data: { slug } });
      console.log(`Backfilled slug: ${audit.brand.name} -> ${slug}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
