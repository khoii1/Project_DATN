BEGIN READ ONLY;
SET LOCAL search_path=pg_catalog;
SELECT json_build_object(
 'user',current_user,'database',current_database(),'port',inet_server_port(),
 'systemId',(SELECT system_identifier::text FROM pg_control_system()),
 'pgdata',current_setting('data_directory'),'version',current_setting('server_version_num'),
 'canLogin',r.rolcanlogin,'superuser',r.rolsuper,'createDB',r.rolcreatedb,'createRole',r.rolcreaterole,
 'readOnly',current_setting('transaction_read_only'))
FROM pg_roles r WHERE rolname=current_user;
ROLLBACK;
