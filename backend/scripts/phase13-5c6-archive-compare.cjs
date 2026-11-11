// Pure PostgreSQL text-COPY comparison. Never prints/stores data values.
const {createHash}=require('node:crypto');
function digest(lines){const h=createHash('sha256');for(const line of [...lines].sort())h.update(Buffer.byteLength(line,'utf8')+':'+line+'\n');return h.digest('hex');}
// Typed timestamptz normalization: preserve microsecond precision, never rewrite text fields.
function normalizeTimestamp(value){
 if(value==='\\N'||value==='infinity'||value==='-infinity')return value;
 const m=value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?([+-])(\d{2})(?::?(\d{2}))?$/);
 if(!m||+m[1]<1000)throw Error('UNSUPPORTED_TYPED_TIMESTAMP_FORMAT');
 const minutes=(+m[9]*60+ +(m[10]||0))*(m[8]==='+'?1:-1);
 const second=Date.UTC(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6])-minutes*60000;
 const fraction=(m[7]||'').replace(/0+$/,'');
 return new Date(second).toISOString().slice(0,19)+(fraction?'.'+fraction:'')+'Z';
}
function canonicalRows(rows,timestampColumns){return rows.map(row=>{const fields=row.split('\t');for(const index of timestampColumns){if(index<0||index>=fields.length)throw Error('TIMESTAMP_COLUMN_OUT_OF_RANGE');fields[index]=normalizeTimestamp(fields[index]);}return fields.join('\t');});}
function parseCopy(text){
 const tables=[];let current=null;
 for(const line of text.replaceAll('\r\n','\n').split('\n')){
  if(current){if(line==='\\.'){tables.push(current);current=null;}else current.rows.push(line);continue;}
  const m=line.match(/^COPY public\.([a-z_]+) \(([a-z_, ]+)\) FROM stdin;$/);
  if(m){if(tables.some(t=>t.table===m[1]))throw Error('DUPLICATE_COPY_TABLE');current={table:m[1],columns:m[2].split(', ').map(s=>s.trim()),rows:[]};}
  else if(/^COPY /.test(line))throw Error('UNSUPPORTED_ARCHIVE_COPY_FORMAT');
 }
 if(current)throw Error('TRUNCATED_COPY_DATA');return tables;
}
function compareRows(expected,actualText,{timestampColumns=[]}={}){let s=actualText.replaceAll('\r\n','\n');if(s.endsWith('\n'))s=s.slice(0,-1);const actual=s===''?[]:s.split('\n');const a=digest(canonicalRows(actual,timestampColumns)),e=digest(canonicalRows(expected.rows,timestampColumns));if(actual.length!==expected.rows.length||a!==e)throw Error('ARCHIVE_TARGET_COPY_DATA_MISMATCH');return {table:expected.table,rows:actual.length,sha256:a,archiveEqual:true,typedTimestampColumns:timestampColumns.length};}
module.exports={digest,parseCopy,compareRows,normalizeTimestamp};
