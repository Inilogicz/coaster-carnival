CREATE TABLE "ExternalPaymentReceipt" (
  "registrationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "data" BYTEA NOT NULL,
  CONSTRAINT "ExternalPaymentReceipt_pkey" PRIMARY KEY ("registrationId"),
  CONSTRAINT "ExternalPaymentReceipt_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
