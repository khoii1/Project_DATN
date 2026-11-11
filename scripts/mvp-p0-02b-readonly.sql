-- P0-02B ONLY. Prepared static inspection, NOT SQL R1.
-- Do not execute until an existing non-superuser login role is explicitly approved.
-- Client: pinned psql17.2, -X -W, fixed5432 target, --file=this file.
-- Provide approved_role as a NON-SECRET psql variable. No interactive SQL prompt.
-- Closed client env must enforce connect/statement/lock timeouts and default RO.
\set ON_ERROR_STOP on
\set ECHO none
\pset format unaligned
\pset tuples_only on
\pset pager off
BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY;
SET LOCAL statement_timeout = '3s';
SET LOCAL lock_timeout = '500ms';
SET LOCAL idle_in_transaction_session_timeout = '10s';
SET LOCAL search_path = pg_catalog;

WITH identity AS MATERIALIZED (
  SELECT current_database() AS db, current_user AS role_name,
         inet_server_addr()::text AS server_addr, inet_server_port() AS port,
         current_setting('server_version_num')::integer AS version_num,
         current_setting('transaction_read_only') AS read_only,
         current_setting('transaction_isolation') AS isolation,
         pg_postmaster_start_time() AS server_started_at,
         transaction_timestamp() AS transaction_started_at,
         clock_timestamp() AS checked_at,
         pg_current_snapshot()::text AS snapshot,
         EXISTS (SELECT 1 FROM pg_catalog.pg_namespace WHERE nspname = 'public') AS public_schema_exists,
         r.rolcanlogin, r.rolsuper, r.rolcreatedb, r.rolcreaterole, r.rolreplication, r.rolbypassrls,
         CASE WHEN has_function_privilege(current_user, 'pg_catalog.pg_control_system()', 'EXECUTE')
              THEN (SELECT system_identifier::text FROM pg_catalog.pg_control_system()) END AS system_id,
         CASE WHEN r.rolsuper OR pg_has_role(current_user, 'pg_read_all_settings', 'USAGE')
              THEN current_setting('data_directory') END AS pgdata
  FROM pg_catalog.pg_roles r WHERE r.rolname = current_user
)
SELECT row_to_json(identity)::text AS p0_identity,
       COALESCE(db = 'smart_agriculture' AND role_name = :'approved_role'
         AND server_addr = '127.0.0.1/32' AND port = 5432
         AND version_num = 170002 AND read_only = 'on' AND isolation = 'repeatable read'
         AND public_schema_exists AND rolcanlogin AND NOT rolsuper
         AND NOT rolcreatedb AND NOT rolcreaterole AND NOT rolreplication AND NOT rolbypassrls
         AND system_id = '7472695863566132416'
         AND lower(replace(pgdata, chr(92), '/')) = 'c:/program files/postgresql/17/data', false) AS p0_identity_ok
FROM identity
\gset
\echo :p0_identity
\if :p0_identity_ok
\else
ROLLBACK;
\quit 3
\endif

SELECT json_build_object('section', 'migrations', 'count', count(*),
  'unfinished', count(*) FILTER (WHERE finished_at IS NULL OR rolled_back_at IS NOT NULL),
  'items', json_agg(json_build_object('name', migration_name, 'checksum', checksum,
    'finishedAt', finished_at, 'rolledBackAt', rolled_back_at) ORDER BY migration_name))
FROM public._prisma_migrations;

SELECT json_build_object('section', 'commands', 'total', count(*),
  'pending', count(*) FILTER (WHERE status::text = 'PENDING'),
  'pendingMqtt', count(*) FILTER (WHERE status::text = 'PENDING' AND transport = 'MQTT'),
  'expiredPending', count(*) FILTER (WHERE status::text = 'PENDING' AND expires_at < transaction_timestamp()),
  'successWithoutCompletedAt', count(*) FILTER (WHERE status::text = 'SUCCESS' AND completed_at IS NULL),
  'pendingWithCompletedAt', count(*) FILTER (WHERE status::text = 'PENDING' AND completed_at IS NOT NULL),
  'mqttSuccessWithoutAck', count(*) FILTER (WHERE status::text = 'SUCCESS' AND transport = 'MQTT' AND acknowledged_at IS NULL),
  'latestRequestedAt', max(requested_at))
FROM public.device_commands;

SELECT json_build_object('section', 'actuator', 'matched', count(*),
  'items', json_agg(json_build_object('deviceCode', d.device_code, 'actuatorCode', a.actuator_code,
    'deviceStatus', d.status, 'connectionStatus', d.connection_status, 'lastSeenAt', d.last_seen_at,
    'actuatorStatus', a.status, 'currentState', a.current_state,
    'lastStateChangedAt', a.last_state_changed_at, 'lastCommandAt', a.last_command_at)))
FROM public.actuators a JOIN public.devices d ON d.id = a.device_id
WHERE d.device_code = 'ESP32-GF-A-01' AND a.actuator_code = 'PUMP_01';

SELECT json_build_object('section', 'transaction', 'readOnly', current_setting('transaction_read_only'),
  'isolation', current_setting('transaction_isolation'), 'snapshot', pg_current_snapshot()::text,
  'checkedAt', clock_timestamp());
ROLLBACK;
