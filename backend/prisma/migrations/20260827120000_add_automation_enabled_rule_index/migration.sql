-- One pump can have at most one enabled automation rule. Disabled rules may coexist.
CREATE UNIQUE INDEX IF NOT EXISTS "automation_rules_one_enabled_per_actuator_idx"
ON "automation_rules"("actuator_id")
WHERE "enabled" = true;
