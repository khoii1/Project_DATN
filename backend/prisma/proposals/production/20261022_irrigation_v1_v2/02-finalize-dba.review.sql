-- REVIEW ARTIFACT ONLY 20261022_irrigation_v1_v2. NOT in prisma/migrations. NOT applied.
-- Separate explicit production approval, verified backup/restore and maintenance window REQUIRED.
-- Execute only using psql ON_ERROR_STOP; never through backend startup. No secrets here.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';
SET LOCAL search_path=pg_catalog;
DO $finalize$ BEGIN
  IF current_setting('smart_agriculture.migration_approval',true) IS DISTINCT FROM '20261022_irrigation_v1_v2'
    OR current_database()<>'smart_agriculture' OR inet_server_port() IS DISTINCT FROM 5432
    OR inet_server_addr()::text IS DISTINCT FROM '127.0.0.1/32' OR current_user<>'postgres'
    OR (SELECT system_identifier::text FROM pg_catalog.pg_control_system())<>'7472695863566132416' THEN
    RAISE EXCEPTION 'FINALIZE_IDENTITY_OR_APPROVAL_MISMATCH'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_catalog.pg_roles r ON r.oid=c.relowner WHERE n.nspname='public' AND c.relkind='r'
    AND r.rolname='sa_irrigation_migrator' AND c.relname IN ('irrigation_cycles','irrigation_decision_logs','irrigation_daily_budgets','irrigation_budget_reservations','irrigation_command_intents','irrigation_safety_states'))<>6 THEN
    RAISE EXCEPTION 'FINALIZE_SIX_OWNED_LEDGERS_REQUIRED'; END IF;
  IF (SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgrelid='public.irrigation_decision_logs'::regclass
    AND tgname IN ('irrigation_v2_append_only','irrigation_v2_no_truncate') AND tgenabled='O')<>2 THEN
    RAISE EXCEPTION 'FINALIZE_AUDIT_TRIGGERS_REQUIRED'; END IF;
  IF has_table_privilege('sa_irrigation_app','public.irrigation_decision_logs','UPDATE')
    OR has_table_privilege('sa_irrigation_app','public.irrigation_decision_logs','DELETE')
    OR has_table_privilege('sa_irrigation_app','public.irrigation_decision_logs','TRUNCATE')
    OR has_schema_privilege('sa_irrigation_app','public','CREATE') THEN RAISE EXCEPTION 'FINALIZE_UNSAFE_APP_PRIVILEGES'; END IF;
END $finalize$;
REVOKE CREATE ON SCHEMA public FROM sa_irrigation_migrator;
REVOKE EXECUTE ON FUNCTION pg_catalog.pg_control_system() FROM sa_irrigation_migrator;
REVOKE SELECT ON public._prisma_migrations FROM sa_irrigation_migrator;
REVOKE REFERENCES (id,device_id) ON public.actuators FROM sa_irrigation_migrator;
REVOKE REFERENCES (id,actuator_id) ON public.device_commands FROM sa_irrigation_migrator;
REVOKE REFERENCES (id,actuator_id) ON public.automation_rules FROM sa_irrigation_migrator;
REVOKE REFERENCES (id) ON public.devices,public.actuators,public.sensor_readings FROM sa_irrigation_migrator;
DO $verify$ BEGIN
  IF has_schema_privilege('sa_irrigation_migrator','public','CREATE') THEN RAISE EXCEPTION 'MIGRATOR_CREATE_STILL_GRANTED'; END IF;
END $verify$;
COMMIT;
