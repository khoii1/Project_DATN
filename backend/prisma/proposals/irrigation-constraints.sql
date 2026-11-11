-- PROPOSAL ONLY. Not applied by generation/validation script.
-- Run only after separately approved migration in an isolated DB first.
ALTER TABLE irrigation_cycles ADD CONSTRAINT irrigation_cycle_counts CHECK (version >= 0 AND pulses >= 0 AND policy_version > 0 AND jsonb_typeof(consumed_keys) = 'array');
ALTER TABLE irrigation_cycles ADD CONSTRAINT irrigation_active_rule CHECK (mode <> 'ACTIVE' OR automation_rule_id IS NOT NULL);
CREATE UNIQUE INDEX irrigation_one_open_cycle ON irrigation_cycles(actuator_id, mode) WHERE closed_at IS NULL;
CREATE UNIQUE INDEX irrigation_one_open_intent ON irrigation_command_intents(actuator_id, mode) WHERE status IN ('RESERVED','DISPATCH_CLAIMED','PUBLISHED','ACKED','UNCERTAIN');
ALTER TABLE irrigation_daily_budgets ADD CONSTRAINT irrigation_budget_bounds CHECK (version >= 0 AND max_runs > 0 AND max_seconds > 0 AND reserved_runs BETWEEN 0 AND max_runs AND reserved_seconds BETWEEN 0 AND max_seconds);
ALTER TABLE irrigation_budget_reservations ADD CONSTRAINT irrigation_reservation_bounds CHECK (version >= 0 AND seconds BETWEEN 1 AND 5);
ALTER TABLE irrigation_command_intents ADD CONSTRAINT irrigation_intent_bounds CHECK (version >= 0 AND pulse_index >= 0 AND max_run_seconds BETWEEN 1 AND 5 AND expires_at > issued_at AND expires_at <= issued_at + interval '30 seconds');
ALTER TABLE irrigation_command_intents ADD CONSTRAINT irrigation_shadow_one_second CHECK (mode <> 'SHADOW' OR max_run_seconds = 1);
ALTER TABLE irrigation_safety_states ADD CONSTRAINT irrigation_safety_version CHECK (version >= 0);
ALTER TABLE irrigation_decision_logs ADD CONSTRAINT irrigation_decision_provenance CHECK (source <> 'VERIFIED_LIVE' OR sensor_reading_id IS NOT NULL);
ALTER TABLE irrigation_decision_logs ADD CONSTRAINT irrigation_active_provenance CHECK (mode <> 'ACTIVE' OR source = 'VERIFIED_LIVE');
-- No cascading deletes on new FKs. Legacy cascades cannot bypass a new RESTRICT FK.
-- Operational roles must not have DELETE/UPDATE on append-only decision logs.
