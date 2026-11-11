-- Phase 13.5A.1 / ledger hardening v2. APPROVED ISOLATED APPLY ONLY.
-- No production target is supported. Six base tables + v1 constraints must exist.
-- Not executed by production startup or Prisma migrate. Isolated runner only.
-- Explicit commit approved for Phase13.5A.1 test instance only; no production support.
BEGIN;
DO $guard$
BEGIN
  IF current_database() <> 'smart_agriculture_test_phase13_3b'
     OR inet_server_port() <> 55433
     OR inet_server_addr()::text <> '127.0.0.1/32'
     OR current_user <> 'phase13_test_migrator' THEN
    RAISE EXCEPTION 'ISOLATED_TEST_TARGET_REQUIRED';
  END IF;
END
$guard$;

-- v1 already supplies unique open intent/cycle, idempotency/correlation keys,
-- composite RESTRICT FKs and quota bounds. Do not duplicate or weaken them.
ALTER TABLE phase13_test_phase13_3b.irrigation_budget_reservations
  ADD CONSTRAINT irrigation_v2_settlement CHECK (
    (status NOT IN ('RELEASED', 'CHARGED') OR settled_at IS NOT NULL)
    AND (settled_at IS NULL OR settled_at >= created_at));
ALTER TABLE phase13_test_phase13_3b.irrigation_command_intents
  ADD CONSTRAINT irrigation_v2_dispatch_order CHECK (
    (published_at IS NULL OR (dispatch_claimed_at IS NOT NULL AND published_at >= dispatch_claimed_at))
    AND (dispatch_claimed_at IS NULL OR dispatch_claimed_at >= issued_at)
    AND (acknowledged_at IS NULL OR (published_at IS NOT NULL AND acknowledged_at >= published_at)));

-- Defense in depth: app cannot mutate audit; trigger also prevents an accidental
-- grant later. Table/schema owners can alter triggers, hence not app principals.
CREATE FUNCTION phase13_test_phase13_3b.irrigation_v2_deny_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  RAISE EXCEPTION 'IRRIGATION_AUDIT_APPEND_ONLY';
END
$body$;
CREATE TRIGGER irrigation_v2_append_only
  BEFORE UPDATE OR DELETE ON phase13_test_phase13_3b.irrigation_decision_logs
  FOR EACH ROW EXECUTE FUNCTION phase13_test_phase13_3b.irrigation_v2_deny_audit_mutation();
CREATE TRIGGER irrigation_v2_no_truncate
  BEFORE TRUNCATE ON phase13_test_phase13_3b.irrigation_decision_logs
  FOR EACH STATEMENT EXECUTE FUNCTION phase13_test_phase13_3b.irrigation_v2_deny_audit_mutation();
REVOKE UPDATE, DELETE, TRUNCATE ON phase13_test_phase13_3b.irrigation_decision_logs FROM phase13_test_app;
COMMIT;

