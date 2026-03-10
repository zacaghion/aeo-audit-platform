-- AlterEnum
ALTER TYPE "AuditStatus" ADD VALUE 'BENCHMARKING';

-- CreateTable
CREATE TABLE "Benchmark" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "brandName" TEXT NOT NULL,
    "isTarget" BOOLEAN NOT NULL DEFAULT false,
    "visibility" INTEGER NOT NULL,
    "mentionRate" DOUBLE PRECISION NOT NULL,
    "sentiment" INTEGER NOT NULL,
    "totalResponses" INTEGER NOT NULL,
    "providerScores" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Benchmark_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Benchmark" ADD CONSTRAINT "Benchmark_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "Audit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
