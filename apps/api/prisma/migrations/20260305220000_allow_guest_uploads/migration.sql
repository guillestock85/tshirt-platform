-- AlterTable: make userId nullable and add guestId for guest uploads
ALTER TABLE "uploads" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "uploads" ADD COLUMN "guestId" TEXT;

-- DropForeignKey (old cascade)
ALTER TABLE "uploads" DROP CONSTRAINT IF EXISTS "uploads_userId_fkey";

-- AddForeignKey (new SetNull)
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
