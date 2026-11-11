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
    OR current_user <> 'sa_irrigation_migrator'
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
DO $prerequisites$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_index i WHERE i.indexrelid=to_regclass('public.actuators_id_device_id_key') AND i.indrelid='public.actuators'::regclass AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnatts=2
    AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum)=ARRAY['id','device_id']::text[])
    THEN RAISE EXCEPTION 'PREREQUISITE_INDEX_MISMATCH_actuators_id_device_id_key'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_index i WHERE i.indexrelid=to_regclass('public.device_commands_id_actuator_id_key') AND i.indrelid='public.device_commands'::regclass AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnatts=2
    AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum)=ARRAY['id','actuator_id']::text[])
    THEN RAISE EXCEPTION 'PREREQUISITE_INDEX_MISMATCH_device_commands_id_actuator_id_key'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_index i WHERE i.indexrelid=to_regclass('public.automation_rules_id_actuator_id_key') AND i.indrelid='public.automation_rules'::regclass AND i.indisunique AND i.indisvalid AND i.indisready AND i.indpred IS NULL AND i.indexprs IS NULL AND i.indnatts=2
    AND (SELECT array_agg(a.attname::text ORDER BY k.ord) FROM unnest(i.indkey) WITH ORDINALITY k(attnum,ord) JOIN pg_catalog.pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=k.attnum)=ARRAY['id','actuator_id']::text[])
    THEN RAISE EXCEPTION 'PREREQUISITE_INDEX_MISMATCH_automation_rules_id_actuator_id_key'; END IF;
  IF EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='sa_irrigation_migrator' AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolcanlogin))
    OR NOT EXISTS(SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='sa_irrigation_app' AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolbypassrls AND NOT rolcanlogin)
    OR pg_has_role('sa_irrigation_app','sa_irrigation_migrator','MEMBER') THEN RAISE EXCEPTION 'UNSAFE_ROLE_TOPOLOGY'; END IF;
END $prerequisites$;
-- CreateEnum
CREATE TYPE public."IrrigationPersistenceMode" AS ENUM ('DISABLED', 'SHADOW', 'ACTIVE');

-- CreateEnum
CREATE TYPE public."IrrigationCyclePhase" AS ENUM ('IDLE', 'ELIGIBLE', 'PENDING_ACK', 'PULSE_ACTIVE', 'WAIT_FRESH_OFF', 'SOAK', 'REEVALUATE', 'FAULT_LOCKED');

-- CreateEnum
CREATE TYPE public."IrrigationIntentStatus" AS ENUM ('RESERVED', 'DISPATCH_CLAIMED', 'PUBLISHED', 'ACKED', 'COMPLETED', 'REJECTED', 'UNCERTAIN', 'CANCELLED');

-- CreateEnum
CREATE TYPE public."IrrigationReservationStatus" AS ENUM ('RESERVED', 'CHARGED', 'UNCERTAIN', 'RELEASED');

-- CreateEnum
CREATE TYPE public."IrrigationDecisionSource" AS ENUM ('FIXTURE', 'MOCK', 'VERIFIED_LIVE');

-- CreateEnum
CREATE TYPE public."IrrigationDecisionOutcome" AS ENUM ('WOULD_ON', 'WOULD_SKIP', 'BLOCKED');

-- CreateTable
CREATE TABLE public."irrigation_cycles" (
    "id" TEXT NOT NULL,
    "actuator_id" TEXT NOT NULL,
    "device_id" TEXT NOT NULL,
    "automation_rule_id" TEXT,
    "policy_key" TEXT NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "policy_snapshot" JSONB NOT NULL,
    "mode" public."IrrigationPersistenceMode" NOT NULL DEFAULT 'DISABLED',
    "phase" public."IrrigationCyclePhase" NOT NULL DEFAULT 'FAULT_LOCKED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "session_generation" TEXT NOT NULL,
    "session_started_at" TIMESTAMPTZ(3) NOT NULL,
    "last_reading_id" TEXT,
    "last_reading_at" TIMESTAMPTZ(3),
    "last_evaluated_at" TIMESTAMPTZ(3),
    "last_pulse_at" TIMESTAMPTZ(3),
    "last_off_at" TIMESTAMPTZ(3),
    "last_off_evidence" JSONB,
    "soak_until" TIMESTAMPTZ(3),
    "pulses" INTEGER NOT NULL DEFAULT 0,
    "consumed_keys" JSONB NOT NULL DEFAULT '[]',
    "closed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "irrigation_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."irrigation_decision_logs" (
    "id" TEXT NOT NULL,
    "evaluation_key" TEXT NOT NULL,
    "cycle_id" TEXT,
    "actuator_id" TEXT NOT NULL,
    "intent_id" TEXT,
    "sensor_reading_id" TEXT,
    "reading_reference" TEXT NOT NULL,
    "policy_key" TEXT NOT NULL,
    "policy_version" INTEGER NOT NULL,
    "mode" public."IrrigationPersistenceMode" NOT NULL,
    "source" public."IrrigationDecisionSource" NOT NULL,
    "outcome" public."IrrigationDecisionOutcome" NOT NULL,
    "reason_code" TEXT NOT NULL,
    "evidence" JSONB NOT NULL,
    "evaluated_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "irrigation_decision_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."irrigation_daily_budgets" (
    "id" TEXT NOT NULL,
    "actuator_id" TEXT NOT NULL,
    "mode" public."IrrigationPersistenceMode" NOT NULL DEFAULT 'DISABLED',
    "local_day" DATE NOT NULL,
    "reserved_runs" INTEGER NOT NULL DEFAULT 0,
    "reserved_seconds" INTEGER NOT NULL DEFAULT 0,
    "max_runs" INTEGER NOT NULL,
    "max_seconds" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "irrigation_daily_budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."irrigation_budget_reservations" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "actuator_id" TEXT NOT NULL,
    "mode" public."IrrigationPersistenceMode" NOT NULL DEFAULT 'DISABLED',
    "cycle_id" TEXT NOT NULL,
    "intent_id" TEXT NOT NULL,
    "seconds" INTEGER NOT NULL,
    "status" public."IrrigationReservationStatus" NOT NULL DEFAULT 'RESERVED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settled_at" TIMESTAMPTZ(3),

    CONSTRAINT "irrigation_budget_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."irrigation_command_intents" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "actuator_id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "mode" public."IrrigationPersistenceMode" NOT NULL DEFAULT 'DISABLED',
    "pulse_index" INTEGER NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "device_command_id" TEXT,
    "session_generation" TEXT NOT NULL,
    "status" public."IrrigationIntentStatus" NOT NULL DEFAULT 'RESERVED',
    "version" INTEGER NOT NULL DEFAULT 0,
    "max_run_seconds" INTEGER NOT NULL,
    "issued_at" TIMESTAMPTZ(3) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "dispatch_claimed_at" TIMESTAMPTZ(3),
    "published_at" TIMESTAMPTZ(3),
    "acknowledged_at" TIMESTAMPTZ(3),
    "reason" TEXT,

    CONSTRAINT "irrigation_command_intents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE public."irrigation_safety_states" (
    "actuator_id" TEXT NOT NULL,
    "mode" public."IrrigationPersistenceMode" NOT NULL DEFAULT 'DISABLED',
    "device_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "fault_latched" BOOLEAN NOT NULL DEFAULT true,
    "emergency_stop" BOOLEAN NOT NULL DEFAULT true,
    "fault_reason" TEXT,
    "reported_state" public."ActuatorState" NOT NULL DEFAULT 'UNKNOWN',
    "session_generation" TEXT,
    "last_confirmed_off_at" TIMESTAMPTZ(3),
    "last_off_evidence" JSONB,
    "cooldown_until" TIMESTAMPTZ(3),
    "manual_override_until" TIMESTAMPTZ(3),
    "last_accepted_server_time" TIMESTAMPTZ(3),
    "budget_day_high_water" DATE,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "irrigation_safety_states_pkey" PRIMARY KEY ("actuator_id","mode")
);

-- CreateIndex
CREATE INDEX "irrigation_cycles_actuator_id_phase_idx" ON public."irrigation_cycles"("actuator_id", "phase");

-- CreateIndex
CREATE INDEX "irrigation_cycles_device_id_idx" ON public."irrigation_cycles"("device_id");

-- CreateIndex
CREATE INDEX "irrigation_cycles_automation_rule_id_idx" ON public."irrigation_cycles"("automation_rule_id");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_cycles_id_actuator_id_mode_key" ON public."irrigation_cycles"("id", "actuator_id", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_decision_logs_evaluation_key_key" ON public."irrigation_decision_logs"("evaluation_key");

-- CreateIndex
CREATE INDEX "irrigation_decision_logs_actuator_id_evaluated_at_idx" ON public."irrigation_decision_logs"("actuator_id", "evaluated_at");

-- CreateIndex
CREATE INDEX "irrigation_decision_logs_cycle_id_idx" ON public."irrigation_decision_logs"("cycle_id");

-- CreateIndex
CREATE INDEX "irrigation_decision_logs_intent_id_idx" ON public."irrigation_decision_logs"("intent_id");

-- CreateIndex
CREATE INDEX "irrigation_decision_logs_sensor_reading_id_idx" ON public."irrigation_decision_logs"("sensor_reading_id");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_daily_budgets_actuator_id_mode_local_day_key" ON public."irrigation_daily_budgets"("actuator_id", "mode", "local_day");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_daily_budgets_id_actuator_id_mode_key" ON public."irrigation_daily_budgets"("id", "actuator_id", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_budget_reservations_intent_id_key" ON public."irrigation_budget_reservations"("intent_id");

-- CreateIndex
CREATE INDEX "irrigation_budget_reservations_budget_id_status_idx" ON public."irrigation_budget_reservations"("budget_id", "status");

-- CreateIndex
CREATE INDEX "irrigation_budget_reservations_cycle_id_idx" ON public."irrigation_budget_reservations"("cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_budget_reservations_intent_id_cycle_id_actuator__key" ON public."irrigation_budget_reservations"("intent_id", "cycle_id", "actuator_id", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_command_intents_correlation_id_key" ON public."irrigation_command_intents"("correlation_id");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_command_intents_device_command_id_key" ON public."irrigation_command_intents"("device_command_id");

-- CreateIndex
CREATE INDEX "irrigation_command_intents_actuator_id_status_idx" ON public."irrigation_command_intents"("actuator_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_command_intents_cycle_id_pulse_index_key" ON public."irrigation_command_intents"("cycle_id", "pulse_index");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_command_intents_mode_idempotency_key_key" ON public."irrigation_command_intents"("mode", "idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_command_intents_id_cycle_id_actuator_id_mode_key" ON public."irrigation_command_intents"("id", "cycle_id", "actuator_id", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_command_intents_id_actuator_id_mode_key" ON public."irrigation_command_intents"("id", "actuator_id", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "irrigation_command_intents_device_command_id_actuator_id_key" ON public."irrigation_command_intents"("device_command_id", "actuator_id");

-- CreateIndex


-- CreateIndex


-- CreateIndex


-- AddForeignKey
ALTER TABLE public."irrigation_cycles" ADD CONSTRAINT "irrigation_cycles_actuator_id_device_id_fkey" FOREIGN KEY ("actuator_id", "device_id") REFERENCES public."actuators"("id", "device_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_cycles" ADD CONSTRAINT "irrigation_cycles_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES public."devices"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_cycles" ADD CONSTRAINT "irrigation_cycles_automation_rule_id_actuator_id_fkey" FOREIGN KEY ("automation_rule_id", "actuator_id") REFERENCES public."automation_rules"("id", "actuator_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_decision_logs" ADD CONSTRAINT "irrigation_decision_logs_cycle_id_actuator_id_mode_fkey" FOREIGN KEY ("cycle_id", "actuator_id", "mode") REFERENCES public."irrigation_cycles"("id", "actuator_id", "mode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_decision_logs" ADD CONSTRAINT "irrigation_decision_logs_actuator_id_fkey" FOREIGN KEY ("actuator_id") REFERENCES public."actuators"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_decision_logs" ADD CONSTRAINT "irrigation_decision_logs_intent_id_actuator_id_mode_fkey" FOREIGN KEY ("intent_id", "actuator_id", "mode") REFERENCES public."irrigation_command_intents"("id", "actuator_id", "mode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_decision_logs" ADD CONSTRAINT "irrigation_decision_logs_sensor_reading_id_fkey" FOREIGN KEY ("sensor_reading_id") REFERENCES public."sensor_readings"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_daily_budgets" ADD CONSTRAINT "irrigation_daily_budgets_actuator_id_fkey" FOREIGN KEY ("actuator_id") REFERENCES public."actuators"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_budget_reservations" ADD CONSTRAINT "irrigation_budget_reservations_budget_id_actuator_id_mode_fkey" FOREIGN KEY ("budget_id", "actuator_id", "mode") REFERENCES public."irrigation_daily_budgets"("id", "actuator_id", "mode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_budget_reservations" ADD CONSTRAINT "irrigation_budget_reservations_cycle_id_actuator_id_mode_fkey" FOREIGN KEY ("cycle_id", "actuator_id", "mode") REFERENCES public."irrigation_cycles"("id", "actuator_id", "mode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_budget_reservations" ADD CONSTRAINT "irrigation_budget_reservations_intent_id_cycle_id_actuator_fkey" FOREIGN KEY ("intent_id", "cycle_id", "actuator_id", "mode") REFERENCES public."irrigation_command_intents"("id", "cycle_id", "actuator_id", "mode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_command_intents" ADD CONSTRAINT "irrigation_command_intents_cycle_id_actuator_id_mode_fkey" FOREIGN KEY ("cycle_id", "actuator_id", "mode") REFERENCES public."irrigation_cycles"("id", "actuator_id", "mode") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_command_intents" ADD CONSTRAINT "irrigation_command_intents_device_command_id_actuator_id_fkey" FOREIGN KEY ("device_command_id", "actuator_id") REFERENCES public."device_commands"("id", "actuator_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE public."irrigation_safety_states" ADD CONSTRAINT "irrigation_safety_states_actuator_id_device_id_fkey" FOREIGN KEY ("actuator_id", "device_id") REFERENCES public."actuators"("id", "device_id") ON DELETE RESTRICT ON UPDATE RESTRICT;


-- PROPOSAL ONLY. Not applied by generation/validation script.
-- Run only after separately approved migration in an isolated DB first.
ALTER TABLE public.irrigation_cycles ADD CONSTRAINT irrigation_cycle_counts CHECK (version >= 0 AND pulses >= 0 AND policy_version > 0 AND jsonb_typeof(consumed_keys) = 'array');
ALTER TABLE public.irrigation_cycles ADD CONSTRAINT irrigation_active_rule CHECK (mode <> 'ACTIVE' OR automation_rule_id IS NOT NULL);
CREATE UNIQUE INDEX irrigation_one_open_cycle ON public.irrigation_cycles(actuator_id, mode) WHERE closed_at IS NULL;
CREATE UNIQUE INDEX irrigation_one_open_intent ON public.irrigation_command_intents(actuator_id, mode) WHERE status IN ('RESERVED','DISPATCH_CLAIMED','PUBLISHED','ACKED','UNCERTAIN');
ALTER TABLE public.irrigation_daily_budgets ADD CONSTRAINT irrigation_budget_bounds CHECK (version >= 0 AND max_runs > 0 AND max_seconds > 0 AND reserved_runs BETWEEN 0 AND max_runs AND reserved_seconds BETWEEN 0 AND max_seconds);
ALTER TABLE public.irrigation_budget_reservations ADD CONSTRAINT irrigation_reservation_bounds CHECK (version >= 0 AND seconds BETWEEN 1 AND 5);
ALTER TABLE public.irrigation_command_intents ADD CONSTRAINT irrigation_intent_bounds CHECK (version >= 0 AND pulse_index >= 0 AND max_run_seconds BETWEEN 1 AND 5 AND expires_at > issued_at AND expires_at <= issued_at + interval '30 seconds');
ALTER TABLE public.irrigation_command_intents ADD CONSTRAINT irrigation_shadow_one_second CHECK (mode <> 'SHADOW' OR max_run_seconds = 1);
ALTER TABLE public.irrigation_safety_states ADD CONSTRAINT irrigation_safety_version CHECK (version >= 0);
ALTER TABLE public.irrigation_decision_logs ADD CONSTRAINT irrigation_decision_provenance CHECK (source <> 'VERIFIED_LIVE' OR sensor_reading_id IS NOT NULL);
ALTER TABLE public.irrigation_decision_logs ADD CONSTRAINT irrigation_active_provenance CHECK (mode <> 'ACTIVE' OR source = 'VERIFIED_LIVE');
-- No cascading deletes on new FKs. Legacy cascades cannot bypass a new RESTRICT FK.
-- Operational roles must not have DELETE/UPDATE on append-only decision logs.

ALTER TABLE public.irrigation_budget_reservations
  ADD CONSTRAINT irrigation_v2_settlement CHECK (
    (status NOT IN ('RELEASED', 'CHARGED') OR settled_at IS NOT NULL)
    AND (settled_at IS NULL OR settled_at >= created_at));
ALTER TABLE public.irrigation_command_intents
  ADD CONSTRAINT irrigation_v2_dispatch_order CHECK (
    (published_at IS NULL OR (dispatch_claimed_at IS NOT NULL AND published_at >= dispatch_claimed_at))
    AND (dispatch_claimed_at IS NULL OR dispatch_claimed_at >= issued_at)
    AND (acknowledged_at IS NULL OR (published_at IS NOT NULL AND acknowledged_at >= published_at)));

-- Defense in depth: app cannot mutate audit; trigger also prevents an accidental
-- grant later. Table/schema owners can alter triggers, hence not app principals.
CREATE FUNCTION public.irrigation_v2_deny_audit_mutation()
RETURNS trigger LANGUAGE plpgsql AS $body$
BEGIN
  RAISE EXCEPTION 'IRRIGATION_AUDIT_APPEND_ONLY';
END
$body$;
CREATE TRIGGER irrigation_v2_append_only
  BEFORE UPDATE OR DELETE ON public.irrigation_decision_logs
  FOR EACH ROW EXECUTE FUNCTION public.irrigation_v2_deny_audit_mutation();
CREATE TRIGGER irrigation_v2_no_truncate
  BEFORE TRUNCATE ON public.irrigation_decision_logs
  FOR EACH STATEMENT EXECUTE FUNCTION public.irrigation_v2_deny_audit_mutation();
REVOKE UPDATE, DELETE, TRUNCATE ON public.irrigation_decision_logs FROM sa_irrigation_app;

ALTER TABLE public.irrigation_cycles ADD CONSTRAINT irr_cycles_shadow_fence CHECK (mode IN ('DISABLED','SHADOW'));
ALTER TABLE public.irrigation_decision_logs ADD CONSTRAINT irr_decision_logs_shadow_fence CHECK (mode IN ('DISABLED','SHADOW'));
ALTER TABLE public.irrigation_daily_budgets ADD CONSTRAINT irr_daily_budgets_shadow_fence CHECK (mode IN ('DISABLED','SHADOW'));
ALTER TABLE public.irrigation_budget_reservations ADD CONSTRAINT irr_budget_reservations_shadow_fence CHECK (mode IN ('DISABLED','SHADOW'));
ALTER TABLE public.irrigation_command_intents ADD CONSTRAINT irr_command_intents_shadow_fence CHECK (mode IN ('DISABLED','SHADOW'));
ALTER TABLE public.irrigation_safety_states ADD CONSTRAINT irr_safety_states_shadow_fence CHECK (mode IN ('DISABLED','SHADOW'));
ALTER TABLE public.irrigation_decision_logs ADD CONSTRAINT irrigation_unverified_source_fence CHECK (source IN ('FIXTURE','MOCK'));

REVOKE ALL ON public.irrigation_cycles FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON public.irrigation_cycles TO sa_irrigation_app;
REVOKE ALL ON public.irrigation_decision_logs FROM PUBLIC;
GRANT SELECT,INSERT ON public.irrigation_decision_logs TO sa_irrigation_app;
REVOKE ALL ON public.irrigation_daily_budgets FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON public.irrigation_daily_budgets TO sa_irrigation_app;
REVOKE ALL ON public.irrigation_budget_reservations FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON public.irrigation_budget_reservations TO sa_irrigation_app;
REVOKE ALL ON public.irrigation_command_intents FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON public.irrigation_command_intents TO sa_irrigation_app;
REVOKE ALL ON public.irrigation_safety_states FROM PUBLIC;
GRANT SELECT,INSERT,UPDATE ON public.irrigation_safety_states TO sa_irrigation_app;
REVOKE UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER ON public.irrigation_decision_logs FROM sa_irrigation_app;
REVOKE ALL ON FUNCTION public.irrigation_v2_deny_audit_mutation() FROM PUBLIC,sa_irrigation_app;
REVOKE ALL ON TYPE public."IrrigationPersistenceMode" FROM PUBLIC;
GRANT USAGE ON TYPE public."IrrigationPersistenceMode" TO sa_irrigation_app;
REVOKE ALL ON TYPE public."IrrigationCyclePhase" FROM PUBLIC;
GRANT USAGE ON TYPE public."IrrigationCyclePhase" TO sa_irrigation_app;
REVOKE ALL ON TYPE public."IrrigationIntentStatus" FROM PUBLIC;
GRANT USAGE ON TYPE public."IrrigationIntentStatus" TO sa_irrigation_app;
REVOKE ALL ON TYPE public."IrrigationReservationStatus" FROM PUBLIC;
GRANT USAGE ON TYPE public."IrrigationReservationStatus" TO sa_irrigation_app;
REVOKE ALL ON TYPE public."IrrigationDecisionSource" FROM PUBLIC;
GRANT USAGE ON TYPE public."IrrigationDecisionSource" TO sa_irrigation_app;
REVOKE ALL ON TYPE public."IrrigationDecisionOutcome" FROM PUBLIC;
GRANT USAGE ON TYPE public."IrrigationDecisionOutcome" TO sa_irrigation_app;
COMMIT;
