'use strict';
// Read-only OS adapter. No work on import; never receives credentials.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const L=require('./strict-lineage.cjs');
function createIO(base,{documentFile,documentSha256,bootstrapAnchor},extraPaths=[]){
 const baseBytes=fs.readFileSync(path.resolve(L.ROOT,L.BASE)),suppBytes=fs.readFileSync(path.resolve(L.ROOT,L.SUPP));if(L.sha(baseBytes)!==L.BASE_SHA||L.sha(suppBytes)!==L.SUPP_SHA)throw Error('SOURCE_BASELINE_AUTHORITY_DRIFT');const baseline=L.parse(baseBytes),supp=L.parse(suppBytes);
 const extras=['scripts/frontend-acceptance/strict-lineage.cjs','scripts/frontend-acceptance/lineage-fs.cjs','scripts/frontend-acceptance/lineage-anchor.cjs',"C:\\Users\\Acer Swift3\\.codex\\attachments\\765e707f-c586-4aa6-a96e-9dbb47b1d92a\\Pasted text.txt",'docs/FINAL_FRONTEND_STRICT_HARDENING_PINS.json'];
 extras.push("C:\\Users\\Acer Swift3\\.codex\\attachments\\9637d66a-599b-4b6b-b608-719bd47bdd2f\\Pasted text.txt",'docs/FINAL_FRONTEND_READY_POLICY_HARDENING_PINS.json');
 extras.push("C:\\Users\\Acer Swift3\\.codex\\attachments\\538b1157-f6d0-4a16-b1c5-c7ad14b5003e\\Pasted text.txt","docs/FINAL_FRONTEND_BROWSER_REMEDIATION_PINS.json");
 const names=[L.BASE,L.SUPP,L.APPROVAL,L.HARDENING_APPROVAL,documentFile,...Object.keys(baseline.sourceHashes),...Object.keys(baseline.runtimeHashes),...Object.keys(baseline.offlineTestHashes),...Object.keys(supp.runtimeSourceHashes),...Object.keys(supp.offlineTestAndHandoffHashes),...Object.keys(supp.browserBinaryHashes),...extras,...extraPaths];
 const absolute=f=>path.isAbsolute(f)?path.resolve(f):path.resolve(L.ROOT,f),paths=[...new Set(names.map(absolute))];
 const stamp=p=>{const s=fs.statSync(p,{bigint:true});return [s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':');};const before=new Map(paths.map(p=>[p,stamp(p)]));
 const script="$ErrorActionPreference='Stop';$paths=[Console]::In.ReadToEnd()|ConvertFrom-Json;$rows=foreach($f in $paths){$a=Get-Acl -LiteralPath $f;$rp=$false;for($q=$f;$q;$q=[IO.Path]::GetDirectoryName($q)){if((Get-Item -LiteralPath $q -Force).Attributes -band [IO.FileAttributes]::ReparsePoint){$rp=$true}};[pscustomobject]@{path=$f;ownerSid=$a.GetOwner([Security.Principal.SecurityIdentifier]).Value;reparse=$rp}};ConvertTo-Json -InputObject @($rows) -Compress";
 const r=cp.spawnSync('C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{input:JSON.stringify(paths),encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:1048576,env:{SystemRoot:'C:\\Windows',WINDIR:'C:\\Windows',PATH:'C:\\Windows\\System32'}});
 if(r.status!==0||r.signal||r.error||r.stderr)throw Error('SOURCE_METADATA_NATIVE_BLOCKED');
 const rows=L.parse(r.stdout),owners=new Map();if(!Array.isArray(rows)||rows.length!==paths.length)throw Error('SOURCE_OWNER_CATALOGUE');
 for(const row of rows){if(owners.has(row.path.toLowerCase())||!/^S-1-/.test(row.ownerSid||'')||row.reparse!==false)throw Error('SOURCE_OWNER_OR_REPARSE_UNKNOWN');owners.set(row.path.toLowerCase(),row.ownerSid);}
 const initial=new Map();
 function state(f){const p=absolute(f);for(let q=p;q;q=path.dirname(q)===q?null:path.dirname(q))if(fs.lstatSync(q).isSymbolicLink())throw Error('SOURCE_REPARSE');const canonicalPath=fs.realpathSync.native(p);if(canonicalPath.toLowerCase()!==p.toLowerCase())throw Error('SOURCE_CANONICAL_DRIFT');const s=fs.statSync(p,{bigint:true});if(!s.isFile())throw Error('SOURCE_NOT_FILE');return {canonicalPath,ownerSid:owners.get(p.toLowerCase()),ownerKnown:owners.has(p.toLowerCase()),reparse:false,ancestorsVerified:true,stamp:[s.dev,s.ino,s.size,s.mtimeNs,s.ctimeNs].join(':')};}
 // Capture file identity before handing IO to verifier. The full verification
 // includes a second pass; ctime also changes when ownership/ACL changes.
 for(const p of paths){const s=state(p);if(s.stamp!==before.get(p))throw Error('SOURCE_CHANGED_DURING_OWNER_CAPTURE');initial.set(p,s);}
 return {...base,lineageAuthority:Object.freeze({documentFile,documentSha256,bootstrapAnchor}),describeSource:f=>{const p=absolute(f),now=state(p),before=initial.get(p);if(!before||before.stamp!==now.stamp)throw Error('SOURCE_STATE_CHANGED');return now;}};
}
module.exports={createIO};
