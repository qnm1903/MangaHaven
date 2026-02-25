-- CreateEnum
CREATE TYPE "public"."MangaSourceType" AS ENUM ('MANGADEX', 'LOCAL');

-- DropForeignKey
ALTER TABLE "public"."comments" DROP CONSTRAINT "comments_mangaId_fkey";

-- AlterTable
ALTER TABLE "public"."comments" ADD COLUMN     "chapterId" TEXT,
ADD COLUMN     "sourceType" "public"."MangaSourceType" NOT NULL DEFAULT 'MANGADEX';

-- CreateIndex
CREATE INDEX "comments_mangaId_chapterId_idx" ON "public"."comments"("mangaId", "chapterId");

-- CreateIndex
CREATE INDEX "comments_sourceType_mangaId_idx" ON "public"."comments"("sourceType", "mangaId");
