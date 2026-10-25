// Explicit offline audit; no network or database writes.
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {compareMigrations} from './lib/colzo-migration-audit.mjs';
const [ledgerPath,outputPath]=process.argv.slice(2);
if(!ledgerPath||!outputPath)throw new Error('Usage: node scripts/audit-colzo-migrations.mjs PRIVATE_LEDGER_JSON OUTPUT_JSON');
const folder=new URL('../supabase/migrations/',import.meta.url);
const files=await Promise.all((await readdir(folder)).filter(n=>n.endsWith('.sql')).sort().map(async path=>{const m=path.match(/^(\d+)_(.*)\.sql$/);if(!m)throw new Error('unrecognised migration filename '+path);return {path,version:m[1],name:m[2],sql:await readFile(new URL(path,folder),'utf8')};}));
const result=compareMigrations(files,JSON.parse(await readFile(resolve(ledgerPath),'utf8')));
await writeFile(resolve(outputPath),JSON.stringify(result,null,2)+'\n',{mode:0o600});
console.log(JSON.stringify(result.summary));
