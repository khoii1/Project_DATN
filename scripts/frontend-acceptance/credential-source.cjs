'use strict';
const {readCredentialInput}=require('../mvp-credential-input.cjs');
const {credential}=require('./policy.cjs');
async function read(stream,deadlineMs=15000){let timer;try{return credential(await Promise.race([readCredentialInput(stream),new Promise((_,reject)=>{timer=setTimeout(()=>{stream.destroy();reject(Error('WEBSITE_CREDENTIAL_DEADLINE'));},deadlineMs);})]));}finally{clearTimeout(timer);}}
module.exports={read};
