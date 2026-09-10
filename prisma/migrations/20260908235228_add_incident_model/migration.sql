-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "title" TEXT,
    "cause" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "endpointId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "incidents_endpointId_status_idx" ON "incidents"("endpointId", "status");

-- CreateIndex
CREATE INDEX "incidents_userId_status_idx" ON "incidents"("userId", "status");

-- Partial Unique Index for Anti-Duplicate OPEN Incidents per Endpoint
CREATE UNIQUE INDEX "unique_open_incident_per_endpoint" ON "incidents" ("endpointId") WHERE status = 'OPEN';

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "api_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
