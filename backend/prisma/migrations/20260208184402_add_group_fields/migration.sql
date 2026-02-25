/*
  Warnings:

  - A unique constraint covering the columns `[mangadexGroupId]` on the table `translation_groups` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."translation_groups" ADD COLUMN     "discord" TEXT,
ADD COLUMN     "focusedLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "mangadexGroupId" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "public"."UserPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readingMode" TEXT NOT NULL DEFAULT 'single_page',
    "autoMarkAsRead" BOOLEAN NOT NULL DEFAULT true,
    "preferredLanguages" TEXT[] DEFAULT ARRAY['en']::TEXT[],
    "contentRatingFilter" TEXT[] DEFAULT ARRAY['safe', 'suggestive']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_userId_key" ON "public"."UserPreferences"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "translation_groups_mangadexGroupId_key" ON "public"."translation_groups"("mangadexGroupId");

-- AddForeignKey
ALTER TABLE "public"."UserPreferences" ADD CONSTRAINT "UserPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
