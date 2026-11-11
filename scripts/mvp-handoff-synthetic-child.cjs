// Offline test fixture only: prints booleans, never reflects input or opens a file/socket.
const {readCredentialInput}=require('./mvp-credential-input.cjs');
(async()=>{
  try {
    const data = await readCredentialInput(process.stdin);
    const matches = data.password === Buffer.from(data.expected, 'base64').toString('utf8');
    console.log(JSON.stringify({matches, utf8Decoder: true, usernameMatches: data.username === 'smartagri_backend'}));
    process.exitCode = matches ? 0 : 3;
  } catch { console.error('SYNTHETIC_INPUT_REFUSED'); process.exitCode = 2; }
})();
