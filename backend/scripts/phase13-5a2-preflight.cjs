// READ ONLY preflight. Never imports server/app/gateway/database singleton.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const ts = require('typescript'), dotenv = require('dotenv');
const { PrismaClient, Prisma } = require('@prisma/client');
const root = path.resolve(__dirname, '../..'), backend = path.join(root, 'backend');
const fileEnv = dotenv.parse(fs.readFileSync(path.join(backend, '.env')));
const effective = { ...fileEnv, ...process.env };
function evaluateEnv(values) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(backend, 'src/config/env.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { exports, process: { env: values }, require(name) { if (name !== 'dotenv') throw Error('ENV_IMPORT_DENIED'); return { config() {} }; } }, { timeout: 1000 });
  return exports.env;
}
async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(backend, 'package.json')));
  const dependencies = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).map(name => {
    const packageFile = path.join(backend,'node_modules',...name.split('/'),'package.json');
    // @types and Prisma CLI need not export a require-able JS entry point.
    return { name, installed: fs.existsSync(packageFile) };
  });
  const planned = { ...effective, PORT: '5000', MQTT_ENABLED: 'true', MQTT_BROKER_URL: 'mqtt://172.20.10.2:1883',
    MQTT_COMMANDS_ENABLED: 'false', MQTT_AUTOMATION_COMMANDS_ENABLED: 'false', MQTT_PUMP_TEST_MODE: 'true', MQTT_PUMP_MAX_RUN_SECONDS: '1' };
  let configValid = false, plannedConfigValid = false, config;
  try { config = evaluateEnv(effective); configValid = true; } catch { /* don't emit raw values or thrown config text */ }
  try { evaluateEnv(planned); plannedConfigValid = true; } catch { /* explicit missing-fields output below only */ }
  const target = new URL(fileEnv.DATABASE_URL);
  if (!['localhost','127.0.0.1'].includes(target.hostname) || (target.port || '5432') !== '5432' || target.pathname !== '/smart_agriculture') throw Error('READ_TARGET_MISMATCH');
  const client = new PrismaClient({ datasourceUrl: fileEnv.DATABASE_URL });
  let database;
  try {
    database = await client.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const [identity] = await tx.$queryRawUnsafe("SELECT current_database() AS database,current_schema() AS schema,inet_server_port() AS port,pg_postmaster_start_time()::text AS started,current_setting('transaction_read_only') AS read_only");
      if (identity.database !== 'smart_agriculture' || identity.schema !== 'public' || identity.port !== 5432 || identity.read_only !== 'on') throw Error('READ_TARGET_MISMATCH');
      const columns = await tx.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='device_commands'");
      const required = ['transport','correlation_id','expires_at','acknowledged_at','max_run_seconds','sent_at'];
      const missingColumns = required.filter(name => !columns.some(c => c.column_name === name));
      const migrations = await tx.$queryRawUnsafe('SELECT migration_name, finished_at, rolled_back_at FROM public._prisma_migrations ORDER BY migration_name');
      return { identity, missingDeviceCommandColumns: missingColumns, migrationCount: migrations.length,
        unfinishedMigrations: migrations.filter(m => !m.finished_at && !m.rolled_back_at).length,
        pending: await tx.deviceCommand.count({ where: { status: 'PENDING' } }),
        mqttPending: await tx.deviceCommand.count({ where: { status: 'PENDING', transport: 'MQTT' } }),
        commandCount: await tx.deviceCommand.count(),
        recoveryWouldSetUnknown: await tx.actuator.count({ where: { actuatorCode: 'PUMP_01', device: { deviceCode: 'ESP32-GF-A-01' }, commands: { some: { transport: 'MQTT' } } } }),
        enabledAutomationRuleCount: await tx.automationRule.count({ where: { enabled: true } }) };
    });
  } finally { await client.$disconnect(); }
  const logs = ['backend-final.out.log','backend-final.err.log'].map(name => {
    const file = path.join(root, 'build/phase13-4a', name);
    if (!fs.existsSync(file)) return {name, available:false};
    const text = fs.readFileSync(file, 'utf8');
    return { name, modifiedAt: fs.statSync(file).mtime.toISOString(), bytes: fs.statSync(file).size,
      refusedEndpoints: [...new Set(text.match(/ECONNREFUSED\s+(?:\d{1,3}\.){3}\d{1,3}:\d+/g) || [])],
      hasReconnect: text.includes('MQTT reconnecting'), hasExitSignalMarker: /SIGINT|SIGTERM|Graceful shutdown/.test(text), exitCode: 'NOT_CAPTURED' };
  });
  const requiredSecretsPresence = Object.fromEntries(['DATABASE_URL','JWT_SECRET','MQTT_USERNAME','MQTT_PASSWORD'].map(key => [key, Boolean(effective[key]) ]));
  const mqttMissing = ['MQTT_USERNAME','MQTT_PASSWORD'].filter(key => !effective[key]);
  const report = { checkedAt:new Date().toISOString(), node:process.version, prismaClient:Prisma.prismaVersion.client,
    npm:execFileSync('cmd.exe',['/d','/c','npm --version'],{encoding:'utf8',windowsHide:true}).trim(),
    scripts:{dev:pkg.scripts.dev,start:pkg.scripts.start,build:pkg.scripts.build,predev:pkg.scripts.predev || null,prestart:pkg.scripts.prestart || null},
    dependencies, requiredSecretsPresence, currentConfigurationValidation:configValid,
    missingPrismaClientFields:['transport','correlationId','expiresAt','acknowledgedAt','maxRunSeconds','sentAt'].filter(name=>!Prisma.dmmf.datamodel.models.find(m=>m.name==='DeviceCommand')?.fields.some(f=>f.name===name)),
    currentConfigNotRuntime:config ? { port:config.port,mqttEnabled:config.mqttEnabled,commands:config.mqttCommandsEnabled,automation:config.mqttAutomationCommandsEnabled,testMode:config.mqttPumpTestMode,effectiveMaxRunSeconds:Math.min(config.mqttPumpMaxRunSeconds,config.mqttPumpTestMode?1:5),
      brokerEndpoint:(()=>{const u=new URL(config.mqttBrokerUrl);return {host:u.hostname,port:u.port || '1883'};})() } : null,
    proposedChildOnlyEnvironment:{PORT:'5000',MQTT_ENABLED:'true',MQTT_BROKER_URL:'mqtt://172.20.10.2:1883',MQTT_COMMANDS_ENABLED:'false',MQTT_AUTOMATION_COMMANDS_ENABLED:'false',MQTT_PUMP_TEST_MODE:'true',MQTT_PUMP_MAX_RUN_SECONDS:'1'},
    plannedEnvironmentValidation:plannedConfigValid,missingMqttVariables:mqttMissing,
    sourceDefaultsAreNotRuntimeAttestation:true,database,logs,backendStarted:false,
    startupSideEffects:{recoveryDml:true,mayInvalidateOldOffToUnknown:true,telemetryAndPresenceDml:true,alertsAndRuleMetadataMayChange:true,automaticCommandGatewayLockedWhenFlagsFalse:true,automaticMigrationOrSeedFound:false} };
  const file = path.join(root,process.argv.includes('--phase13-5a3')?'report/phase13-5a3-preflight.json':'report/phase13-5a2-preflight.json'); fs.writeFileSync(file,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(JSON.stringify({status:'PREFLIGHT_STOP',code:e.code,reason:/^[A-Z_]+$/.test(e.message)?e.message:'DIAGNOSTIC_FAILED_REDACTED'}));process.exitCode=1;});
