-- Additive only. Review and deploy before running the updated backend.
ALTER TABLE "device_commands"
  ADD COLUMN "transport" TEXT NOT NULL DEFAULT 'MOCK',
  ADD COLUMN "expires_at" TIMESTAMP(3),
  ADD COLUMN "max_run_seconds" INTEGER,
  ADD COLUMN "acknowledged_at" TIMESTAMP(3);
