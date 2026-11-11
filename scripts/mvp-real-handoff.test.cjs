const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
test('actual launcher UTF-8 function and PowerShell AST: five native synthetic round-trips without secret reflection',()=>{
  const script=String.raw`
$ErrorActionPreference='Stop'
$tokens=$null;$errors=$null
$ast=[Management.Automation.Language.Parser]::ParseFile((Join-Path (Get-Location) 'scripts/mvp-real-esp32-launch.ps1'),[ref]$tokens,[ref]$errors)
if($errors.Count){throw 'AST_FAILED'}
$fn=@($ast.FindAll({param($n) $n -is [Management.Automation.Language.FunctionDefinitionAst] -and $n.Name -ceq 'Write-MvpUtf8Json'},$true))
if($fn.Count -ne 1){throw 'HANDOFF_FUNCTION_MISSING'}
Invoke-Expression $fn[0].Extent.Text
$samples=@('SYNTHETIC_ASCII_ONLY_123!',('SYNTHETIC_'+[char]0x1EC7+'_'+[char]0x20AC),'  SYNTHETIC_SPACES  ',('SYNTHETIC_"\_!$'),('SYNTHETIC_'+[char]0xD83C+[char]0xDF31))
$rows=@()
foreach($sample in $samples){
 $credential=New-Object Management.Automation.PSCredential('smartagri_backend',(ConvertTo-SecureString $sample -AsPlainText -Force))
 $info=New-Object Diagnostics.ProcessStartInfo
 $info.FileName='C:\Program Files\nodejs\node.exe'
 $info.Arguments='--require "'+(Join-Path (Get-Location) 'scripts/acceptance-offline-guard.cjs')+'" "'+(Join-Path (Get-Location) 'scripts/mvp-handoff-synthetic-child.cjs')+'"'
 $info.UseShellExecute=$false;$info.CreateNoWindow=$true
 $info.RedirectStandardInput=$true;$info.RedirectStandardOutput=$true;$info.RedirectStandardError=$true
 $p=New-Object Diagnostics.Process;$p.StartInfo=$info
 try {
  if(-not $p.Start()){throw 'SYNTHETIC_START_FAILED'}
  $plain=$credential.GetNetworkCredential().Password
  $json=@{username=$credential.UserName;password=$plain;expected=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($sample))}|ConvertTo-Json -Compress
  Write-MvpUtf8Json -Child $p -Json $json
  $plain=$null;$json=$null;$credential=$null
  if(-not $p.WaitForExit(5000)){throw 'SYNTHETIC_TIMEOUT'}
  $out=$p.StandardOutput.ReadToEnd();$err=$p.StandardError.ReadToEnd()
  if($out.Contains($sample) -or $err.Contains($sample)){throw 'SECRET_REFLECTION'}
  $rows+=@{exitCode=$p.ExitCode;result=($out|ConvertFrom-Json);stderrEmpty=($err.Length -eq 0)}
 } finally {$p.Dispose()}
}
@{astPass=$true;cases=$rows}|ConvertTo-Json -Compress -Depth 5
`;
  // A blank line terminates compound statements in Windows PowerShell's stdin parser.
  const input=script.replace(/\r?\n/g,'\r\n').replace(/}\r\n/g,'}\r\n\r\n')+'\r\n';
  const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','-'],{cwd:root,input,encoding:'utf8',windowsHide:true,timeout:25000});
  assert.equal(r.status,0,'NATIVE_HANDOFF_TEST_EXIT');assert.equal(r.stderr,'');
  assert.ok(!r.stdout.includes('SYNTHETIC_'),'NO_SECRET_REFLECTION');
  const result=JSON.parse(r.stdout.trim());assert.equal(result.astPass,true);assert.equal(result.cases.length,5);
  for(const row of result.cases){assert.equal(row.exitCode,0);assert.equal(row.stderrEmpty,true);assert.deepEqual(row.result,{matches:true,utf8Decoder:true,usernameMatches:true});}
});
test('launcher keeps exact credential input, byte-only pipe and no password CLI/file/global env',()=>{
  const s=fs.readFileSync(path.join(__dirname,'mvp-real-esp32-launch.ps1'),'utf8');
  assert.match(s,/Get-Credential -UserName 'smartagri_backend'/);assert.match(s,/GetNetworkCredential\(\)\.Password/);
  assert.match(s,/Write-MvpUtf8Json -Child \$p -Json \$json/);assert.match(s,/StandardInput\.BaseStream\.Write/);
  assert.match(s,/\[Array\]::Clear\(\$utf8Bytes/);
  assert.doesNotMatch(s,/StandardInput\.Write\(|StandardInputEncoding|\.Trim\(|\.Normalize\(|Set-Content|WriteAll|Out-File|SetEnvironmentVariable/);
  const args=s.split('\n').find(x=>x.startsWith('$info.Arguments='));assert.doesNotMatch(args,/password|credential|plain|json/i);
});
test('synthetic child rejects malformed JSON, no reflected input and finite native exit',()=>{
  const sample='SYNTHETIC_MALFORMED_SECRET';
  const r=spawnSync(process.execPath,['--require','./scripts/acceptance-offline-guard.cjs','./scripts/mvp-handoff-synthetic-child.cjs'],{cwd:root,input:sample,encoding:'utf8',timeout:5000});
  assert.equal(r.status,2);assert.equal(r.stdout,'');assert.ok(!r.stderr.includes(sample));
});
test('actual Node decoder preserves Unicode, spaces and JSON escapes split at every byte',async()=>{
  const {Readable}=require('node:stream'),{readCredentialInput}=require('./mvp-credential-input.cjs');
  const expected={username:'smartagri_backend',password:'  SYNTHETIC_ệ_€_🌱_"\\  '};
  const bytes=Buffer.from(JSON.stringify(expected),'utf8');
  const input=Readable.from((async function*(){for(const byte of bytes){yield Buffer.from([byte]);await new Promise(r=>setImmediate(r));}})());
  assert.deepEqual(await readCredentialInput(input),expected);
});
test('decoder size limit and malformed JSON fail without reflecting synthetic input',async()=>{
  const {Readable}=require('node:stream'),{readCredentialInput}=require('./mvp-credential-input.cjs');
  await assert.rejects(readCredentialInput(Readable.from([Buffer.from('SYNTHETIC_SECRET_INVALID')])),{message:'CREDENTIAL_JSON_INVALID'});
  await assert.rejects(readCredentialInput(Readable.from([Buffer.alloc(8193,65)])),{message:'HANDOFF_LIMIT'});
});
