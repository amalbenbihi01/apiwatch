-- CreateTable
CREATE TABLE "api_checks" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatusCode" INTEGER,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpointId" TEXT NOT NULL,

    CONSTRAINT "api_checks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_checks_endpointId_checkedAt_idx" ON "api_checks"("endpointId", "checkedAt");

-- AddForeignKey
ALTER TABLE "api_checks" ADD CONSTRAINT "api_checks_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "api_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;
