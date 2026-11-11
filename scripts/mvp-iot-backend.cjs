// Dedicated DEV hardware-observation entrypoint. Cannot publish any MQTT application message.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),http=require('node:http');
const root=path.resolve(__dirname,'..'),url=new URL(process.env.DATABASE_URL||'invalid:');
if(url.hostname!=='127.0.0.1'||url.port!=='55433'||url.pathname!=='/smart_agriculture_mvp_dev'||url.username!=='sa_mvp_dev_app'||process.env.PORT!=='55001'||process.env.MQTT_ENABLED!=='true'||process.env.MQTT_COMMANDS_ENABLED!=='false'||process.env.MQTT_AUTOMATION_COMMANDS_ENABLED!=='false'||process.env.MQTT_PUMP_TEST_MODE!=='true'||process.env.MQTT_PUMP_MAX_RUN_SECONDS!=='1'||process.env.MQTT_BROKER_URL!=='mqtt://172.20.10.2:1883'||process.env.MVP_IOT_IDENTITY_VERIFIED!=='ESP32-GF-A-01'||!process.env.MQTT_BACKEND_CLIENT_ID?.startsWith('mvp-iot-backend-')||process.env.NODE_OPTIONS)throw Error('IOT_DEV_SAFETY_TARGET_REFUSED');
const read=fs.readFileSync,exists=fs.existsSync,blocked=f=>typeof f==='string'&&path.resolve(f).toLowerCase().startsWith(root.toLowerCase()+path.sep)&&/^\.env(?:\.|$)/.test(path.basename(f));
fs.existsSync=function(f){return blocked(f)?false:exists.apply(this,arguments);};fs.readFileSync=function(f){if(blocked(f))throw Error('IOT_PRODUCTION_ENV_REFUSED');return read.apply(this,arguments);};
const original=Module._load;
Module._load=function(name,...args){if(name==='dotenv')return{config:()=>({parsed:{}})};const value=original.call(this,name,...args);if(name!=='mqtt')return value;
 let proxy;proxy=new Proxy(value,{get(obj,key){if(key==='default')return proxy;if(key==='connect')return(endpoint,options)=>{if(endpoint!=='mqtt://172.20.10.2:1883'||options.clientId!==process.env.MQTT_BACKEND_CLIENT_ID)throw Error('IOT_BROKER_IDENTITY_REFUSED');return require('./mvp-iot-transport.cjs').restrictSubscriber(obj.connect(endpoint,{...options,reconnectPeriod:0}));};return Reflect.get(obj,key);}});return proxy;};
const listen=http.Server.prototype.listen;http.Server.prototype.listen=function(port,callback){if(port!==55001)throw Error('IOT_DEV_BIND_REFUSED');return listen.call(this,55001,'127.0.0.1',callback);};
process.on('message',m=>{if(m==='STOP'&&process.listenerCount('SIGTERM'))process.emit('SIGTERM');});
require(path.join(root,'backend/node_modules/tsx/dist/cjs/index.cjs'));require(path.join(root,'backend/src/server.ts'));
