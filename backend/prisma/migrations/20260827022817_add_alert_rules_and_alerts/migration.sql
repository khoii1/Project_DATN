-- CreateEnum
CREATE TYPE "AlertOperator" AS ENUM ('LT', 'LTE', 'GT', 'GTE');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "AlertResolutionReason" AS ENUM ('AUTO_RECOVERED', 'MANUAL', 'RULE_DISABLED', 'RULE_UPDATED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_ALERT_RULE';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_ALERT_RULE';
ALTER TYPE "ActivityAction" ADD VALUE 'ENABLE_ALERT_RULE';
ALTER TYPE "ActivityAction" ADD VALUE 'DISABLE_ALERT_RULE';
ALTER TYPE "ActivityAction" ADD VALUE 'ACKNOWLEDGE_ALERT';
ALTER TYPE "ActivityAction" ADD VALUE 'MANUAL_RESOLVE_ALERT';

-- CreateTable
CREATE TABLE "alert_rules" (
    "id" TEXT NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "operator" "AlertOperator" NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "recovery_threshold" DOUBLE PRECISION,
    "severity" "AlertSeverity" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "message" TEXT,
    "created_by_id" TEXT,
    "last_evaluated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alert_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alerts" (
    "id" TEXT NOT NULL,
    "alert_rule_id" TEXT NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "status" "AlertStatus" NOT NULL DEFAULT 'OPEN',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "trigger_value" DOUBLE PRECISION NOT NULL,
    "last_value" DOUBLE PRECISION NOT NULL,
    "threshold_snapshot" DOUBLE PRECISION NOT NULL,
    "recovery_snapshot" DOUBLE PRECISION,
    "operator_snapshot" "AlertOperator" NOT NULL,
    "severity_snapshot" "AlertSeverity" NOT NULL,
    "unit_snapshot" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL,
    "last_reading_at" TIMESTAMP(3) NOT NULL,
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by_id" TEXT,
    "resolved_at" TIMESTAMP(3),
    "resolved_by_id" TEXT,
    "resolution_reason" "AlertResolutionReason",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "alert_rules_sensor_id_idx" ON "alert_rules"("sensor_id");

-- CreateIndex
CREATE INDEX "alert_rules_enabled_idx" ON "alert_rules"("enabled");

-- CreateIndex
CREATE INDEX "alert_rules_severity_idx" ON "alert_rules"("severity");

-- CreateIndex
CREATE INDEX "alerts_alert_rule_id_status_idx" ON "alerts"("alert_rule_id", "status");

-- CreateIndex
CREATE INDEX "alerts_sensor_id_idx" ON "alerts"("sensor_id");

-- CreateIndex
CREATE INDEX "alerts_status_idx" ON "alerts"("status");

-- CreateIndex
CREATE INDEX "alerts_severity_snapshot_idx" ON "alerts"("severity_snapshot");

-- CreateIndex
CREATE INDEX "alerts_opened_at_idx" ON "alerts"("opened_at");

-- Enforce one active incident per rule even under concurrent telemetry.
CREATE UNIQUE INDEX "alerts_one_active_per_rule_idx"
ON "alerts"("alert_rule_id")
WHERE "status" IN ('OPEN', 'ACKNOWLEDGED');

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alert_rules" ADD CONSTRAINT "alert_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_alert_rule_id_fkey" FOREIGN KEY ("alert_rule_id") REFERENCES "alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_acknowledged_by_id_fkey" FOREIGN KEY ("acknowledged_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_resolved_by_id_fkey" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
