CREATE TABLE "EmailVerification" (
  "email" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "ipHash" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "tokenHash" TEXT,
  CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("email")
);
CREATE INDEX "EmailVerification_ipHash_sentAt_idx" ON "EmailVerification"("ipHash", "sentAt");
