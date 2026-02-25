/*
  Warnings:

  - A unique constraint covering the columns `[userId,externalMangaId]` on the table `favorites` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "favorites" ADD COLUMN     "externalMangaId" TEXT,
ADD COLUMN     "mangaSource" "MangaSourceType" NOT NULL DEFAULT 'LOCAL',
ALTER COLUMN "mangaId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "favorites_userId_mangaSource_idx" ON "favorites"("userId", "mangaSource");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_userId_externalMangaId_key" ON "favorites"("userId", "externalMangaId");
