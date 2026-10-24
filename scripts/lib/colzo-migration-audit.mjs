import {createHash} from 'node:crypto';
// Conservative lexical comparison. Never authorises migration-history repair.
// Dollar-quoted bodies and quoted literals remain byte-sensitive by design.
export function sqlTokens(sql){
 const out=[]; let i=0;
 while(i<sql.length){
  if(/\s/.test(sql[i])){i++;continue;}
  if(sql.startsWith('--',i)){const n=sql.indexOf('\n',i+2);i=n<0?sql.length:n+1;continue;}
  if(sql.startsWith('/*',i)){
   i+=2;let depth=1;
   while(i<sql.length&&depth){if(sql.startsWith('/*',i)){depth++;i+=2;}else if(sql.startsWith('*/',i)){depth--;i+=2;}else i++;}
   if(depth)throw new Error('unterminated SQL comment');continue;
  }
  const start=i, dollar=sql.slice(i).match(/^\$(?:[A-Za-z_][A-Za-z_0-9]*)?\$/)?.[0];
  if(dollar){const end=sql.indexOf(dollar,i+dollar.length);if(end<0)throw new Error('unterminated dollar quote');i=end+dollar.length;out.push(sql.slice(start,i));continue;}
  const escape=sql[i]?.toLowerCase()==='e'&&sql[i+1]==="'";
  if(sql[i]==="'"||sql[i]==='"'||escape){
   if(escape)i++;const quote=sql[i++];let closed=false;
   while(i<sql.length){if(escape&&sql[i]==='\\'){i+=2;continue;}if(sql[i]===quote){if(sql[i+1]===quote){i+=2;continue;}i++;closed=true;break;}i++;}
   if(!closed)throw new Error('unterminated SQL literal');out.push(sql.slice(start,i));continue;
  }
  const word=sql.slice(i).match(/^[A-Za-z_0-9$]+/);
  if(word){i+=word[0].length;out.push(word[0]);continue;}
  out.push(sql[i++]);
 }
 // The API splits statements without retaining their terminating semicolons.
 while(out.at(-1)===';')out.pop();
 return out;
}
const hash=s=>createHash('sha256').update(s).digest('hex');
export function compareMigrations(files,ledger){
 const prepared=ledger.map(row=>({...row,sql:(row.statements||[]).join('\n;\n')+'\n;',rawSha256:hash(JSON.stringify(row.statements)),tokens:sqlTokens((row.statements||[]).join('\n;\n')+'\n;')}));
 const result=files.map(file=>{
  const tokens=sqlTokens(file.sql), normalized=JSON.stringify(tokens);
  const sqlMatches=prepared.filter(r=>JSON.stringify(r.tokens)===normalized).map(r=>({version:r.version,name:r.name}));
  return {path:file.path,version:file.version,name:file.name,rawSha256:hash(file.sql),tokenSha256:hash(normalized),sqlMatches,
   sameVersion:prepared.filter(r=>r.version===file.version).map(r=>({version:r.version,name:r.name,sqlEqual:JSON.stringify(r.tokens)===normalized})),
   sameName:prepared.filter(r=>r.name===file.name).map(r=>({version:r.version,name:r.name,sqlEqual:JSON.stringify(r.tokens)===normalized}))};
 });
 const ledgerRows=prepared.map(r=>({version:r.version,name:r.name,rawSha256:r.rawSha256,tokenSha256:hash(JSON.stringify(r.tokens)),matches:result.filter(f=>f.sqlMatches.some(m=>m.version===r.version)).map(f=>f.path)}));
 return {method:'Conservative SQL token equality; quoted bodies/literals preserved. Neither semantic equivalence nor repair approval.',summary:{repositoryFiles:files.length,ledgerEntries:ledger.length,filesWithSqlMatch:result.filter(f=>f.sqlMatches.length).length,ledgerWithSqlMatch:ledgerRows.filter(r=>r.matches.length).length,sameVersionDifferentSql:result.filter(f=>f.sameVersion.some(r=>!r.sqlEqual)).length},files:result,ledger:ledgerRows};
}
