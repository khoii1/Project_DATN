-- CreateEnum
CREATE TYPE "ActuatorType" AS ENUM ('PUMP', 'VALVE', 'RELAY', 'OTHER');

-- CreateEnum
CREATE TYPE "ActuatorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ActuatorState" AS ENUM ('ON', 'OFF', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "DeviceCommandType" AS ENUM ('TURN_ON', 'TURN_OFF');

-- CreateEnum
CREATE TYPE "DeviceCommandSource" AS ENUM ('MANUAL', 'AUTOMATION');

-- CreateEnum
CREATE TYPE "DeviceCommandStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_ACTUATOR';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_ACTUATOR';
ALTER TYPE "ActivityAction" ADD VALUE 'CHANGE_ACTUATOR_STATUS';
ALTER TYPE "ActivityAction" ADD VALUE 'ISSUE_DEVICE_COMMAND';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_STAFF_IRRIGATION_PERMISSION';

-- AlterTable
ALTER TABLE "farm_staff_assignments" ADD COLUMN     "can_control_irrigation" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "actuators" (
    "id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "actuator_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "ActuatorType" NOT NULL,
    "status" "ActuatorStatus" NOT NULL DEFAULT 'ACTIVE',
    "current_state" "ActuatorState" NOT NULL DEFAULT 'UNKNOWN',
    "hardware_channel" TEXT,
    "description" TEXT,
    "last_command_at" TIMESTAMP(3),
    "last_state_changed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actuators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_commands" (
    "id" TEXT NOT NULL,
    "actuator_id" TEXT NOT NULL,
    "command" "DeviceCommandType" NOT NULL,
    "source" "DeviceCommandSource" NOT NULL,
    "status" "DeviceCommandStatus" NOT NULL DEFAULT 'PENDING',
    "requested_by_id" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "correlation_id" TEXT NOT NULL,

    CONSTRAINT "device_commands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "actuators_device_id_idx" ON "actuators"("device_id");

-- CreateIndex
CREATE INDEX "actuators_type_idx" ON "actuators"("type");

-- CreateIndex
CREATE INDEX "actuators_status_idx" ON "actuators"("status");

-- CreateIndex
CREATE INDEX "actuators_current_state_idx" ON "actuators"("current_state");

-- CreateIndex
CREATE UNIQUE INDEX "actuators_device_id_actuator_code_key" ON "actuators"("device_id", "actuator_code");

-- CreateIndex
CREATE UNIQUE INDEX "device_commands_correlation_id_key" ON "device_commands"("correlation_id");

-- CreateIndex
CREATE INDEX "device_commands_actuator_id_idx" ON "device_commands"("actuator_id");

-- CreateIndex
CREATE INDEX "device_commands_status_idx" ON "device_commands"("status");

-- CreateIndex
CREATE INDEX "device_commands_requested_at_idx" ON "device_commands"("requested_at");

-- CreateIndex
CREATE INDEX "device_commands_requested_by_id_idx" ON "device_commands"("requested_by_id");

-- Enforce at most one in-flight command per actuator under concurrent requests.
CREATE UNIQUE INDEX "device_commands_one_pending_per_actuator_idx"
ON "device_commands"("actuator_id")
WHERE "status" = 'PENDING';

-- AddForeignKey
ALTER TABLE "actuators" ADD CONSTRAINT "actuators_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "devices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_actuator_id_fkey" FOREIGN KEY ("actuator_id") REFERENCES "actuators"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_commands" ADD CONSTRAINT "device_commands_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
