-- AlterTable
ALTER TABLE "oauth_access_tokens" ADD COLUMN     "scope" TEXT;

-- AlterTable
ALTER TABLE "oauth_authorization_codes" ADD COLUMN     "scope" TEXT;
