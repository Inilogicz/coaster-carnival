CREATE TABLE "AnalyticsVisit" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "attemptedAt" TIMESTAMP(3),
  "submittedAt" TIMESTAMP(3),
  "registrationId" TEXT,
  CONSTRAINT "AnalyticsVisit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AnalyticsVisit_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AnalyticsVisit_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AnalyticsVisit_eventId_visitorHash_source_key" ON "AnalyticsVisit"("eventId", "visitorHash", "source");
CREATE INDEX "AnalyticsVisit_eventId_source_idx" ON "AnalyticsVisit"("eventId", "source");
CREATE INDEX "AnalyticsVisit_registrationId_idx" ON "AnalyticsVisit"("registrationId");
