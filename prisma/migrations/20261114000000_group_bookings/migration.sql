ALTER TABLE "Registration" ADD COLUMN "bookingParentId" TEXT;
DROP INDEX "Registration_eventId_email_key";
CREATE INDEX "Registration_eventId_email_idx" ON "Registration"("eventId", "email");
CREATE UNIQUE INDEX "Registration_primary_email_key" ON "Registration"("eventId", "email") WHERE "bookingParentId" IS NULL;
ALTER TABLE "Registration" ADD CONSTRAINT "Registration_bookingParentId_fkey" FOREIGN KEY ("bookingParentId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
