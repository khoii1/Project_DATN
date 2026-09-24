-- CreateEnum
CREATE TYPE "FarmStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ZoneStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "CropStatus" AS ENUM ('PLANNED', 'GROWING', 'HARVESTED', 'CANCELLED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_FARM';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_FARM';
ALTER TYPE "ActivityAction" ADD VALUE 'CHANGE_FARM_STATUS';
ALTER TYPE "ActivityAction" ADD VALUE 'ASSIGN_STAFF';
ALTER TYPE "ActivityAction" ADD VALUE 'REMOVE_STAFF';
ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_ZONE';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_ZONE';
ALTER TYPE "ActivityAction" ADD VALUE 'CHANGE_ZONE_STATUS';
ALTER TYPE "ActivityAction" ADD VALUE 'CREATE_CROP';
ALTER TYPE "ActivityAction" ADD VALUE 'UPDATE_CROP';
ALTER TYPE "ActivityAction" ADD VALUE 'CHANGE_CROP_STATUS';

-- CreateTable
CREATE TABLE "farms" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "description" TEXT,
    "area_hectares" DECIMAL(10,2),
    "status" "FarmStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "farms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_staff_assignments" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_staff_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "zones" (
    "id" TEXT NOT NULL,
    "farm_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "area_hectares" DECIMAL(10,2),
    "status" "ZoneStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crops" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variety" TEXT,
    "planting_date" TIMESTAMP(3),
    "expected_harvest_date" TIMESTAMP(3),
    "actual_harvest_date" TIMESTAMP(3),
    "status" "CropStatus" NOT NULL DEFAULT 'PLANNED',
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "crops_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "farms_owner_id_idx" ON "farms"("owner_id");

-- CreateIndex
CREATE INDEX "farms_status_idx" ON "farms"("status");

-- CreateIndex
CREATE INDEX "farms_created_at_idx" ON "farms"("created_at");

-- CreateIndex
CREATE INDEX "farm_staff_assignments_staff_id_idx" ON "farm_staff_assignments"("staff_id");

-- CreateIndex
CREATE INDEX "farm_staff_assignments_farm_id_idx" ON "farm_staff_assignments"("farm_id");

-- CreateIndex
CREATE UNIQUE INDEX "farm_staff_assignments_farm_id_staff_id_key" ON "farm_staff_assignments"("farm_id", "staff_id");

-- CreateIndex
CREATE INDEX "zones_farm_id_idx" ON "zones"("farm_id");

-- CreateIndex
CREATE INDEX "zones_status_idx" ON "zones"("status");

-- CreateIndex
CREATE INDEX "zones_created_at_idx" ON "zones"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "zones_farm_id_name_key" ON "zones"("farm_id", "name");

-- CreateIndex
CREATE INDEX "crops_zone_id_idx" ON "crops"("zone_id");

-- CreateIndex
CREATE INDEX "crops_status_idx" ON "crops"("status");

-- CreateIndex
CREATE INDEX "crops_planting_date_idx" ON "crops"("planting_date");

-- CreateIndex
CREATE INDEX "crops_created_at_idx" ON "crops"("created_at");

-- AddForeignKey
ALTER TABLE "farms" ADD CONSTRAINT "farms_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_staff_assignments" ADD CONSTRAINT "farm_staff_assignments_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_staff_assignments" ADD CONSTRAINT "farm_staff_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zones" ADD CONSTRAINT "zones_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crops" ADD CONSTRAINT "crops_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
