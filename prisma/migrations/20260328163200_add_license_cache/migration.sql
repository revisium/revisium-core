-- CreateTable
CREATE TABLE "LicenseCache" (
    "id" TEXT NOT NULL DEFAULT 'current',
    "payload" JSONB NOT NULL,
    "validatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LicenseCache_pkey" PRIMARY KEY ("id")
);
