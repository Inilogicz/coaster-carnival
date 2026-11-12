ALTER TYPE "RegistrationStatus" ADD VALUE 'AWAITING_APPROVAL';
ALTER TABLE "Event" ADD COLUMN "externalRegistrationKey" TEXT;
ALTER TABLE "Registration" ADD COLUMN "externalPaymentNote" TEXT, ADD COLUMN "approvedBy" TEXT, ADD COLUMN "approvedAt" TIMESTAMP(3);
