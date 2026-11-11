// Private pipe decoder only. No filesystem, environment or network access.
async function readCredentialInput(stream) {
  stream.setEncoding('utf8'); // StringDecoder preserves code points split across native pipe chunks.
  let text = '';
  try {
    for await (const chunk of stream) {
      text += chunk;
      if (Buffer.byteLength(text, 'utf8') > 8192) throw Error('HANDOFF_LIMIT');
    }
    try { return JSON.parse(text); }
    catch { throw Error('CREDENTIAL_JSON_INVALID'); } // Never reflect input in parser errors.
  } finally { text = ''; }
}
module.exports = {readCredentialInput};
