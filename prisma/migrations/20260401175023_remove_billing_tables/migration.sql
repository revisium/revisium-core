-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "UsageRecord" DROP CONSTRAINT "UsageRecord_subscriptionId_fkey";

-- DropTable
DROP TABLE "UsageRecord";

-- DropTable
DROP TABLE "Subscription";

-- DropEnum
DROP TYPE "BillingInterval";

-- DropEnum
DROP TYPE "BillingStatus";
