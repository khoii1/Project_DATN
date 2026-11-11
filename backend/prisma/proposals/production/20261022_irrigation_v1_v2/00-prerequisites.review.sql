-- REVIEW ARTIFACT ONLY 20261022_irrigation_v1_v2. NOT in prisma/migrations. NOT applied.
-- Separate explicit production approval, verified backup/restore and maintenance window REQUIRED.
-- Execute only using psql ON_ERROR_STOP; never through backend startup. No secrets here.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='60s';
SET LOCAL search_path=pg_catalog;
DO $guard$
DECLARE actual_fingerprint text;
BEGIN
  IF current_setting('smart_agriculture.migration_approval',true) IS DISTINCT FROM '20261022_irrigation_v1_v2'
    OR current_database() <> 'smart_agriculture' OR current_schema() <> 'pg_catalog' OR to_regnamespace('public') IS NULL
    OR inet_server_port() IS DISTINCT FROM 5432 OR inet_server_addr()::text IS DISTINCT FROM '127.0.0.1/32'
    OR current_user <> 'postgres'
    OR (SELECT system_identifier::text FROM pg_catalog.pg_control_system()) <> '7472695863566132416' THEN
    RAISE EXCEPTION 'PRODUCTION_MIGRATION_TARGET_OR_APPROVAL_MISMATCH';
  END IF;
  SELECT fingerprint INTO actual_fingerprint FROM (SELECT pg_catalog.md5(pg_catalog.string_agg(c.relname || ':' || a.attname || ':' || pg_catalog.replace(pg_catalog.format_type(a.atttypid,a.atttypmod),'public.','') || ':' || a.attnotnull::text, '|' ORDER BY c.relname,a.attnum)) AS fingerprint
FROM pg_catalog.pg_attribute a JOIN pg_catalog.pg_class c ON c.oid=a.attrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('devices','actuators','sensor_readings','device_commands','automation_rules') AND a.attnum>0 AND NOT a.attisdropped) AS expected_columns;
  IF actual_fingerprint IS DISTINCT FROM '390c65cfe11f3b8695a6bc5ff21d94d4' THEN RAISE EXCEPTION 'LEGACY_COLUMN_DRIFT'; END IF;
  SELECT fingerprint INTO actual_fingerprint FROM (SELECT pg_catalog.md5(pg_catalog.string_agg(c.relname || ':' || k.conname || ':' || pg_catalog.replace(pg_catalog.pg_get_constraintdef(k.oid),'public.','') || ':' || k.convalidated::text, '|' ORDER BY c.relname,k.conname)) AS fingerprint
FROM pg_catalog.pg_constraint k JOIN pg_catalog.pg_class c ON c.oid=k.conrelid JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('devices','actuators','sensor_readings','device_commands','automation_rules')) AS expected_constraints;
  IF actual_fingerprint IS DISTINCT FROM '2e5981464ef4017e1ad5a6854ba17cc2' THEN RAISE EXCEPTION 'LEGACY_CONSTRAINT_DRIFT'; END IF;
  IF (SELECT array_agg(e.enumlabel ORDER BY e.enumsortorder)::text FROM pg_catalog.pg_enum e
    WHERE e.enumtypid=to_regtype('public."ActuatorState"')) IS DISTINCT FROM '{ON,OFF,UNKNOWN}' THEN
    RAISE EXCEPTION 'ACTUATOR_STATE_ENUM_DRIFT';
  END IF;
  IF EXISTS(SELECT 1 FROM public._prisma_migrations WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL)
    OR (SELECT count(*) FROM public._prisma_migrations) <> 11
    OR EXISTS(SELECT 1 FROM (VALUES ('20260826044448_add_users_auth','76b3bf2f8ebc4c546968bd58a4e53aad6df82c90af2977e589ab50f6e793df30'),
('20260826053517_add_farms_zones_crops','35f717305819cc2399770595bd83e7156e9015e39ee0d7f76b70116067f45da6'),
('20260826064902_add_iot_devices','1bf8a8bde5fe2b15494972a9860f868ee4d0390c39e0362c9c1d5e9ab3bfb950'),
('20260826091140_add_sensors_and_readings','426c3af4a3084563b2e430993210e66df40f65646f2a5852bc0557a708202c68'),
('20260826143000_rename_temperature_sensor_type_to_temp','183dfec7e273f4e49598b623bfcd180b795fe1f46280d7131d3c1836a4071a5a'),
('20260827022817_add_alert_rules_and_alerts','d1c72dfea3cfc3a4aa4e40cfada2d117bb11d45e966e8f455f39eb300602c83c'),
('20260827032735_add_actuators_and_device_commands','21c26cc5d219040d4a8d1a960e6d185ef17877a1af09ce0fe38c56cfe47356dc'),
('20260827113854_add_automation_rules','1d70eb0324962afd4451f95c86df81a95e1b324db7631070263572dcfa22aea3'),
('20260827120000_add_automation_enabled_rule_index','2a011f06e820a1efbc7a0db1e4bf78e55222997e22a891f42e9577eea07ae8a5'),
('20260827150000_add_activity_log_farm_scope','0a0365622567856c7eaae02f11955f9368b40eaf6a787a3d0f2f6ad6b5e594b8'),
('20261014090000_mqtt_pump_commands','2a38418373a21de5d33e522efa74b0734d80a37e61eca28e905bd12e8b06f221')) AS e(name,checksum)
      LEFT JOIN public._prisma_migrations m ON m.migration_name=e.name AND m.checksum=e.checksum WHERE m.id IS NULL) THEN
    RAISE EXCEPTION 'PRISMA_BASELINE_DRIFT';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname IN ('irrigation_cycles','irrigation_decision_logs','irrigation_daily_budgets','irrigation_budget_reservations','irrigation_command_intents','irrigation_safety_states'))
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_type t JOIN pg_catalog.pg_namespace n ON n.oid=t.typnamespace
      WHERE n.nspname='public' AND t.typname LIKE 'Irrigation%')
    OR EXISTS(SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE n.nspname='public' AND p.proname='irrigation_v2_deny_audit_mutation') THEN
    RAISE EXCEPTION 'LEDGER_OBJECT_CONFLICT_STOP_NO_IF_NOT_EXISTS';
  END IF;
END
$guard$;

DO $roles$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname IN ('sa_irrigation_migrator','sa_irrigation_app')) THEN RAISE EXCEPTION 'ROLE_CONFLICT_STOP'; END IF;
  IF current_setting('data_directory') <> 'C:/Program Files/PostgreSQL/17/data' THEN RAISE EXCEPTION 'PGDATA_MISMATCH'; END IF;
END $roles$;
CREATE ROLE sa_irrigation_migrator NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE sa_irrigation_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT CONNECT ON DATABASE smart_agriculture TO sa_irrigation_migrator,sa_irrigation_app;
GRANT USAGE,CREATE ON SCHEMA public TO sa_irrigation_migrator;
GRANT USAGE ON SCHEMA public TO sa_irrigation_app;
GRANT EXECUTE ON FUNCTION pg_catalog.pg_control_system() TO sa_irrigation_migrator;
GRANT SELECT ON public._prisma_migrations TO sa_irrigation_migrator;
GRANT REFERENCES (id,device_id) ON public.actuators TO sa_irrigation_migrator;
GRANT REFERENCES (id,actuator_id) ON public.device_commands TO sa_irrigation_migrator;
GRANT REFERENCES (id,actuator_id) ON public.automation_rules TO sa_irrigation_migrator;
GRANT REFERENCES (id) ON public.devices,public.actuators,public.sensor_readings TO sa_irrigation_migrator;
GRANT USAGE ON TYPE public."ActuatorState" TO sa_irrigation_app;
GRANT SELECT ON public.devices,public.actuators,public.sensor_readings,public.device_commands,public.automation_rules TO sa_irrigation_app;
CREATE UNIQUE INDEX "actuators_id_device_id_key" ON public."actuators"("id", "device_id");
CREATE UNIQUE INDEX "device_commands_id_actuator_id_key" ON public."device_commands"("id", "actuator_id");
CREATE UNIQUE INDEX "automation_rules_id_actuator_id_key" ON public."automation_rules"("id", "actuator_id");
COMMIT;
