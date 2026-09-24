-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('CONTROLLER', 'GATEWAY', 'OTHER');

-- CreateEnum
CREATE TYPE "DeviceStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "DeviceConnectionStatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_DEVICE';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_DEVICE';
ALTER TYPE "ActivityAction" ADD VALUE 'CHANGE_DEVICE_STATUS';

-- CreateTable
CREATE TABLE "devices" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "device_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeviceType" NOT NULL,
    "hardware_model" TEXT,
    "firmware_version" TEXT,
    "status" "DeviceStatus" NOT NULL DEFAULT 'ACTIVE',
    "connection_status" "DeviceConnectionStatus" NOT NULL DEFAULT 'UNKNOWN',
    "last_seen_at" TIMESTAMP(3),
    "installed_at" TIMESTAMP(3),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "devices_device_code_key" ON "devices"("device_code");

-- CreateIndex
CREATE INDEX "devices_zone_id_idx" ON "devices"("zone_id");

-- CreateIndex
CREATE INDEX "devices_status_idx" ON "devices"("status");

-- CreateIndex
CREATE INDEX "devices_connection_status_idx" ON "devices"("connection_status");

-- CreateIndex
CREATE INDEX "devices_created_at_idx" ON "devices"("created_at");

-- AddForeignKey
ALTER TABLE "devices" ADD CONSTRAINT "devices_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
