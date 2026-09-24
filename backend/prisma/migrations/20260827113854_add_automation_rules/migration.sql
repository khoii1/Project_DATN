-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_AUTOMATION_RULE';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_AUTOMATION_RULE';
ALTER TYPE "ActivityAction" ADD VALUE 'ENABLE_AUTOMATION_RULE';
ALTER TYPE "ActivityAction" ADD VALUE 'DISABLE_AUTOMATION_RULE';

-- AlterTable
ALTER TABLE "device_commands" ADD COLUMN     "automation_rule_id" TEXT;

-- CreateTable
CREATE TABLE "automation_rules" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sensor_id" TEXT NOT NULL,
    "actuator_id" TEXT NOT NULL,
    "start_threshold" DOUBLE PRECISION NOT NULL,
    "stop_threshold" DOUBLE PRECISION NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "last_evaluated_at" TIMESTAMP(3),
    "last_command_attempt_at" TIMESTAMP(3),
    "description" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_rules_sensor_id_idx" ON "automation_rules"("sensor_id");

-- CreateIndex
CREATE INDEX "automation_rules_actuator_id_idx" ON "automation_rules"("actuator_id");

-- CreateIndex
CREATE INDEX "automation_rules_enabled_idx" ON "automation_rules"("enabled");

-- CreateIndex
CREATE INDEX "automation_rules_created_at_idx" ON "automation_rules"("created_at");

-- CreateIndex
CREATE INDEX "device_commands_automation_rule_id_idx" ON "device_commands"("automation_rule_id");

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_automation_rule_id_fkey" FOREIGN KEY ("automation_rule_id") REFERENCES "automation_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_sensor_id_fkey" FOREIGN KEY ("sensor_id") REFERENCES "sensors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_actuator_id_fkey" FOREIGN KEY ("actuator_id") REFERENCES "actuators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_rules" ADD CONSTRAINT "automation_rules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
