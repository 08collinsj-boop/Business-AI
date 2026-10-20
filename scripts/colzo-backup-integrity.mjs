#!/usr/bin/env node
/**
 * Colzo encrypted logical-backup protection utility.
 *
 * Protects an ALREADY EXISTING PostgreSQL dump; does not connect to databases,
 * create the dump, restore SQL, or handle third-party credentials.
 *
 * Syntax: seal <plaintext-dump> <encrypted-file>
 *         verify <encrypted-file>
 *         extract <encrypted-file> <isolated-output-file>
 *
 * Only files outside this Git repository are accepted to avoid accidentally
 * committing private business data. Never put the key in a command line.
 */
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {createReadStream,createWriteStream,realpathSync} from 'node:fs';
import {appendFile,link,lstat,open,unlink} from 'node:fs/promises';
import {basename,dirname,relative,resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {pipeline} from 'node:stream/promises';
import {Writable} from 'node:stream';

const MAGIC=Buffer.from('COLZOBK1','ascii');
const IV_LENGTH=12;
const TAG_LENGTH=16;
const HEADER_LENGTH=MAGIC.length+IV_LENGTH;
const ROOT=resolve(dirname(fileURLToPath(import.meta.url)),'..');

function refuseRepoPath(p){
  const absolute=resolve(p);
  // Check lexical and real parent paths so an external symlink cannot point
  // backup output back into the repository.
  const real=resolve(realpathSync.native(dirname(absolute)),basename(absolute));
  for(const candidate of [absolute,real]){
    const rel=relative(ROOT,candidate);
    if(!rel||(!rel.startsWith('..'+sep)&&rel!=='..'&&!rel.startsWith(sep))){
      throw Error('Refusing backup source or destination inside the Git repository.');
    }
  }
  return absolute;
}
async function regularFile(p){
  const file=refuseRepoPath(p);
  const stat=await lstat(file);
  if(!stat.isFile())throw Error('Expected an ordinary file; symbolic links are not allowed.');
  return {file,stat};
}
async function destination(p){
  const file=refuseRepoPath(p);
  try{await lstat(file);throw Error('Output already exists. Refusing to overwrite.')}
  catch(e){if(e.code!=='ENOENT')throw e}
  return file;
}
function encryptionKey(){
  const hex=process.env.COLZO_BACKUP_KEY_HEX||'';
  if(!/^[0-9a-fA-F]{64}$/.test(hex)){
    throw Error('COLZO_BACKUP_KEY_HEX must be a private, 32-byte hex value from a secure secret manager.');
  }
  return Buffer.from(hex,'hex');
}
function uniqueTemp(dest){
  return dest+'.partial-'+process.pid+'-'+randomBytes(6).toString('hex');
}
async function publishTemp(tmp,dest){
  await link(tmp,dest);
  await unlink(tmp);
}
async function seal(src,dest,key){
  const input=await regularFile(src);
  const output=await destination(dest);
  if(!input.stat.size)throw Error('Refusing an empty backup source.');
  if((input.stat.mode&0o077)!==0){
    throw Error('Unencrypted backup is not private (requires owner-only permissions, e.g. chmod 600).');
  }
  if(input.file===output)throw Error('Source and destination must differ.');
  const iv=randomBytes(IV_LENGTH);
  const cipher=createCipheriv('aes-256-gcm',key,iv);
  cipher.setAAD(MAGIC);
  const tmp=uniqueTemp(output);
  try{
    const stream=createWriteStream(tmp,{flags:'wx',mode:0o600});
    try{
      await new Promise((done,fail)=>stream.write(Buffer.concat([MAGIC,iv]),e=>e?fail(e):done()));
      await pipeline(createReadStream(input.file),cipher,stream);
    }catch(error){stream.destroy();throw error}
    await appendFile(tmp,cipher.getAuthTag());
    await publishTemp(tmp,output);
    process.stdout.write('Encrypted backup sealed. Store the backup and its key separately.\n');
  }finally{await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e})}
}
async function openEncrypted(src){
  const {file,stat}=await regularFile(src);
  if(stat.size<=HEADER_LENGTH+TAG_LENGTH)throw Error('Invalid or truncated encrypted backup.');
  const fd=await open(file,'r');
  try{
    const header=Buffer.alloc(HEADER_LENGTH);
    const tag=Buffer.alloc(TAG_LENGTH);
    const headerRead=await fd.read(header,0,header.length,0);
    const tagRead=await fd.read(tag,0,tag.length,stat.size-TAG_LENGTH);
    if(headerRead.bytesRead!==header.length||tagRead.bytesRead!==tag.length){
      throw Error('Truncated or unreadable backup header.');
    }
    if(!header.subarray(0,MAGIC.length).equals(MAGIC))throw Error('Unsupported backup format.');
    return {file,iv:header.subarray(MAGIC.length),tag,end:stat.size-TAG_LENGTH-1};
  }finally{await fd.close()}
}
async function authenticatedRead(src,key,target){
  const data=await openEncrypted(src);
  const decipher=createDecipheriv('aes-256-gcm',key,data.iv);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(data.tag);
  const source=createReadStream(data.file,{start:HEADER_LENGTH,end:data.end});
  await pipeline(source,decipher,target);
}
async function verify(src,key){
  let n=0;
  const sink=new Writable({write(chunk,encoding,done){n+=chunk.length;done()}});
  await authenticatedRead(src,key,sink);
  if(!n)throw Error('Empty decrypted backup is not accepted.');
  process.stdout.write('Authentication and encrypted-file integrity verified. Database restore NOT tested.\n');
}
async function extract(src,dest,key){
  const output=await destination(dest);
  const tmp=uniqueTemp(output);
  try{
    const stream=createWriteStream(tmp,{flags:'wx',mode:0o600});
    await authenticatedRead(src,key,stream);
    if((await lstat(tmp)).size===0)throw Error('Empty decrypted backup is not accepted.');
    await publishTemp(tmp,output);
    process.stdout.write('Authenticated backup extracted to isolated output. Database restore NOT performed.\n');
  }finally{await unlink(tmp).catch(e=>{if(e.code!=='ENOENT')throw e})}
}
async function main(){
  const [action,a,b,...extra]=process.argv.slice(2);
  if(!['seal','verify','extract'].includes(action)||!a||
    ((action==='verify')?Boolean(b):!b)||extra.length){
    throw Error('Usage: seal <dump> <encrypted> | verify <encrypted> | extract <encrypted> <isolated-output>. Never pass the key as an argument.');
  }
  const key=encryptionKey();
  try{
    if(action==='seal')await seal(a,b,key);
    else if(action==='verify')await verify(a,key);
    else await extract(a,b,key);
  }finally{key.fill(0)}
}
main().catch(error=>{
  process.stderr.write('Backup operation refused or failed: '+error.message+'\n');
  process.exitCode=1;
});
