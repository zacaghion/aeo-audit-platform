-- Make location optional for global businesses
ALTER TABLE "Brand" ALTER COLUMN "location" DROP NOT NULL;
ALTER TABLE "Brand" ALTER COLUMN "location" SET DEFAULT '';
