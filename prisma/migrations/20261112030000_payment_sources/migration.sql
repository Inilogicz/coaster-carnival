CREATE TYPE "PaymentSource" AS ENUM ('WEBSITE', 'EXTERNAL');
ALTER TABLE "Payment" ADD COLUMN "source" "PaymentSource" NOT NULL DEFAULT 'WEBSITE';

-- Include existing approved external registrations without inventing Paystack IDs.
INSERT INTO "Payment" ("id", "registrationId", "reference", "amount", "currency", "status", "source", "gatewayMessage", "paidAt", "createdAt", "updatedAt")
SELECT 'external:' || r."id", r."id", 'EXT-' || r."reference", r."amount", e."currency", 'SUCCESS', 'EXTERNAL', 'External payment approved by organiser', COALESCE(r."approvedAt", r."paidAt"), COALESCE(r."approvedAt", r."paidAt", r."createdAt"), CURRENT_TIMESTAMP
FROM "Registration" r JOIN "Event" e ON e."id" = r."eventId"
WHERE r."status" = 'PAID' AND r."externalPaymentNote" IS NOT NULL
ON CONFLICT ("reference") DO NOTHING;
