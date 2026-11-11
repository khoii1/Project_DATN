// Pure parser for the actual pg_dump 17 DDL subset; unknown constructs fail closed.
function norm(s){return s.replace(/\bpublic\./g,'').replace(/\s+/g,' ').trim();}
function tables(sql){const out=[];for(const m of sql.replaceAll('\r\n','\n').matchAll(/^CREATE TABLE public\.([a-z_]+) \(\n([\s\S]*?)^\);/gm)){
 const columns=[];for(const line of m[2].split('\n').map(l=>l.trim()).filter(Boolean)){
  if(line.startsWith('CONSTRAINT '))throw Error('INLINE_CONSTRAINT_REQUIRES_REVIEW');
  const c=line.replace(/,$/,'').match(/^([a-z_]+) (.+)$/);if(!c)throw Error('UNSUPPORTED_COLUMN_DDL');
  let tail=c[2],notNull=false;if(tail.endsWith(' NOT NULL')){notNull=true;tail=tail.slice(0,-9);}
  if(/\bGENERATED\b|\bCOLLATE\b/.test(tail))throw Error('SPECIAL_COLUMN_DDL_REQUIRES_REVIEW');
  const d=tail.indexOf(' DEFAULT ');columns.push({name:c[1],type:norm(d<0?tail:tail.slice(0,d)),default:d<0?null:norm(tail.slice(d+9)),notNull});
 }
 out.push({table:m[1],columns});
 }if(!out.length)throw Error('ARCHIVE_TABLE_SCHEMA_MISSING');return out;}
function constraints(sql){const out=[];for(const m of sql.replaceAll('\r\n','\n').matchAll(/^ALTER TABLE ONLY public\.([a-z_]+)\n\s+ADD CONSTRAINT ([a-z_]+) ([\s\S]*?);/gm))out.push({table:m[1],name:m[2],definition:norm(m[3])});return out;}
function enums(sql){const out=[];for(const m of sql.matchAll(/CREATE TYPE public\."([A-Za-z_]+)" AS ENUM \(([\s\S]*?)\);/g))out.push({name:m[1],labels:[...m[2].matchAll(/'((?:[^']|'')*)'/g)].map(x=>x[1].replaceAll("''","'"))});return out;}
module.exports={norm,tables,constraints,enums};
