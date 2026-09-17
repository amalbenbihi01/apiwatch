-- AlterTable
ALTER TABLE "api_endpoints" ADD COLUMN     "alertEmails" JSONB,
ADD COLUMN     "bodyJson" TEXT,
ADD COLUMN     "headersJson" JSONB,
ADD COLUMN     "queryParamsJson" JSONB,
ADD COLUMN     "recoveryThreshold" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "responseTimeThresholdMs" INTEGER,
ADD COLUMN     "timeoutMs" INTEGER NOT NULL DEFAULT 5000,
ADD COLUMN     "unhealthyThreshold" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "webhookSecret" TEXT,
ADD COLUMN     "webhookUrl" TEXT;
