import { PrismaClient, AuditStatus } from "@prisma/client";
import brandData from "./seed-data/brand.json";
import auditData from "./seed-data/audit-results.json";

const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.brand.findFirst({
    where: { name: brandData.name },
  });

  if (existing) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  console.log("Seeding brand data...");
  const brand = await prisma.brand.create({ data: brandData });
  console.log(`Created brand: ${brand.name} (${brand.id})`);

  try {

    if (auditData && auditData.audit) {
      console.log("Seeding audit data...");

      const audit = await prisma.audit.create({
        data: {
          brandId: brand.id,
          status: auditData.audit.status as AuditStatus,
          config: auditData.audit.config,
          summary: auditData.audit.summary,
          analysis: auditData.audit.analysis,
          startedAt: auditData.audit.startedAt ? new Date(auditData.audit.startedAt) : null,
          completedAt: auditData.audit.completedAt ? new Date(auditData.audit.completedAt) : null,
        },
      });
      console.log(`Created audit: ${audit.id}`);

      for (const promptData of auditData.prompts) {
        const prompt = await prisma.prompt.create({
          data: {
            auditId: audit.id,
            promptNumber: promptData.promptNumber,
            promptText: promptData.promptText,
            category: promptData.category,
            intent: promptData.intent,
            expectedMention: promptData.expectedMention,
          },
        });

        for (const respData of promptData.responses) {
          await prisma.response.create({
            data: {
              promptId: prompt.id,
              provider: respData.provider,
              model: respData.model,
              answer: respData.answer,
              brandMentioned: respData.brandMentioned,
              mentionPosition: respData.mentionPosition,
              mentionSentiment: respData.mentionSentiment,
              competitorsMentioned: respData.competitorsMentioned,
              competitorCount: respData.competitorCount,
              answerLength: respData.answerLength,
              latencyMs: respData.latencyMs,
              status: "success",
            },
          });
        }
      }

      console.log(
        `Seeded ${auditData.prompts.length} prompts with ${auditData.prompts.reduce((s: number, p: { responses: unknown[] }) => s + p.responses.length, 0)} responses`
      );
    }
  } catch {
    console.log("No audit results data found, skipping audit seed.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
