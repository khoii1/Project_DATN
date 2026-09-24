ALTER TABLE "activity_logs" ADD COLUMN "farm_id" TEXT;

ALTER TABLE "activity_logs"
ADD CONSTRAINT "activity_logs_farm_id_fkey"
FOREIGN KEY ("farm_id") REFERENCES "farms"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "activity_logs_farm_id_created_at_idx"
ON "activity_logs"("farm_id", "created_at");

CREATE INDEX "activity_logs_created_at_idx"
ON "activity_logs"("created_at");
