-- Rename Hotel table to Brand
ALTER TABLE "Hotel" RENAME TO "Brand";

-- Rename type column to category
ALTER TABLE "Brand" RENAME COLUMN "type" TO "category";

-- Rename hotelId to brandId in Audit table
ALTER TABLE "Audit" RENAME COLUMN "hotelId" TO "brandId";

-- Rename hotelMentioned to brandMentioned in Response table  
ALTER TABLE "Response" RENAME COLUMN "hotelMentioned" TO "brandMentioned";
