-- DropForeignKey
ALTER TABLE "listing_messages" DROP CONSTRAINT "listing_messages_listingId_fkey";

-- DropForeignKey
ALTER TABLE "listing_messages" DROP CONSTRAINT "listing_messages_receiverCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "listing_messages" DROP CONSTRAINT "listing_messages_senderCompanyId_fkey";

-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT "listings_companyId_fkey";

-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT "listings_partId_fkey";

-- DropForeignKey
ALTER TABLE "listings" DROP CONSTRAINT "listings_userId_fkey";

-- AlterTable
ALTER TABLE "subscription_plans" DROP COLUMN "maxListings";

-- DropTable
DROP TABLE "listing_messages";

-- DropTable
DROP TABLE "listings";

-- DropEnum
DROP TYPE "ListingStatus";
