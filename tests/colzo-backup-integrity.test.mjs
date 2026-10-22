import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {randomBytes,createHash} from 'node:crypto';
import {readFileSync,writeFileSync,mkdtempSync,statSync,symlinkSync,existsSync,rmSync,mkdirSync,chmodSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const tool=fileURLToPath(new URL('../scripts/colzo-backup-integrity.mjs',import.meta.url));
const repo=resolve(fileURLToPath(new URL('..',import.meta.url)));
const hash=data=>createHash('sha256').update(data).digest('hex');
function call(args,key=randomBytes(32).toString('hex')){
  return spawnSync(process.execPath,[tool,...args],{
    encoding:'utf8',timeout:15000,
    env:{...process.env,COLZO_BACKUP_KEY_HEX:key}
  });
}
function fixture(fn){
  const root=mkdtempSync(join(tmpdir(),'colzo-synthetic-backup-'));
  try{return fn(root)}finally{rmSync(root,{recursive:true,force:true})}
}
test('synthetic dump round-trip uses authenticated encryption, strict permissions and no implicit database restoration',()=>{
 fixture(root=>{
   const key=randomBytes(32).toString('hex');
   const data=Buffer.from('Synthetic QA records only. No customers. '.repeat(2048));
   const plain=join(root,'synthetic.dump'),sealed=join(root,'backup.czbak'),restored=join(root,'restored.dump');
   writeFileSync(plain,data,{mode:0o600});
   let result=call(['seal',plain,sealed],key);
   assert.equal(result.status,0,result.stderr);
   assert.ok(existsSync(sealed));
   assert.equal(statSync(sealed).mode&0o777,0o600);
   assert.ok(!readFileSync(sealed).includes('Synthetic QA records'));
   assert.ok(readFileSync(sealed).length>data.length);
   result=call(['verify',sealed],key);
   assert.equal(result.status,0,result.stderr);
   assert.match(result.stdout,/Database restore NOT tested/);
   result=call(['extract',sealed,restored],key);
   assert.equal(result.status,0,result.stderr);
   assert.equal(statSync(restored).mode&0o777,0o600);
   assert.equal(hash(readFileSync(restored)),hash(data));
   assert.match(result.stdout,/Database restore NOT performed/);
   result=call(['seal',plain,sealed],key);
   assert.notEqual(result.status,0);
   assert.match(result.stderr,/already exists/);
 });
});
test('wrong key, tampering and truncation cannot publish recovered output',()=>{
 fixture(root=>{
   const key=randomBytes(32).toString('hex');
   const plain=join(root,'data.dump'),sealed=join(root,'ok.czbak');
   writeFileSync(plain,'Synthetic private backup data',{mode:0o600});
   assert.equal(call(['seal',plain,sealed],key).status,0);
   const wrong=call(['verify',sealed],randomBytes(32).toString('hex'));
   assert.notEqual(wrong.status,0);
   assert.ok(!wrong.stdout.includes('verified'));
   const wrongOut=join(root,'wrong.dump');
   assert.notEqual(call(['extract',sealed,wrongOut],randomBytes(32).toString('hex')).status,0);
   assert.ok(!existsSync(wrongOut));
   const tampered=Buffer.from(readFileSync(sealed));
   tampered[23]^=0x40;
   const tamperedPath=join(root,'tampered.czbak'),tamperedOut=join(root,'tampered.dump');
   writeFileSync(tamperedPath,tampered);
   assert.notEqual(call(['verify',tamperedPath],key).status,0);
   assert.notEqual(call(['extract',tamperedPath,tamperedOut],key).status,0);
   assert.ok(!existsSync(tamperedOut));
   writeFileSync(join(root,'truncated.czbak'),tampered.subarray(0,22));
   assert.notEqual(call(['verify',join(root,'truncated.czbak')],key).status,0);
 });
});
test('fails closed for missing key, empty dumps, symlinks, repository paths and accidental overwrites',()=>{
 fixture(root=>{
   const key=randomBytes(32).toString('hex');
   const empty=join(root,'empty.dump'),plain=join(root,'synthetic.dump'),dest=join(root,'sealed.czbak');
   writeFileSync(empty,'',{mode:0o600});writeFileSync(plain,'safe fixture',{mode:0o600});
   assert.notEqual(call(['seal',empty,dest],key).status,0);
   assert.notEqual(call(['seal',plain,dest],'not-a-key').status,0);
   // Refuse a real dump that is accidentally visible to other users.
   chmodSync(plain,0o644);
   assert.notEqual(call(['seal',plain,dest],key).status,0);
   chmodSync(plain,0o600);
   assert.equal(call(['seal',plain,dest],key).status,0);
   symlinkSync(dest,join(root,'link.czbak'));
   assert.notEqual(call(['verify',join(root,'link.czbak')],key).status,0);
   writeFileSync(join(root,'occupied.dump'),'keep');
   assert.notEqual(call(['extract',dest,join(root,'occupied.dump')],key).status,0);
   assert.equal(readFileSync(join(root,'occupied.dump'),'utf8'),'keep');
   assert.notEqual(call(['seal',join(repo,'package.json'),join(root,'blocked.czbak')],key).status,0);
   assert.notEqual(call(['extract',dest,join(repo,'blocked.dump')],key).status,0);
   mkdirSync(join(root,'alias-target'),{recursive:true});
   symlinkSync(join(repo,'scripts'),join(root,'link-to-repo'));
   assert.notEqual(call(['extract',dest,join(root,'link-to-repo','blocked.dump')],key).status,0);
 });
});
test('streams a multi-megabyte synthetic dump and catches ciphertext and tag corruption',()=>{
 fixture(root=>{
   const key=randomBytes(32).toString('hex');
   const data=randomBytes(8*1024*1024+17);
   const original=join(root,'synthetic-8mb.dump'),sealed=join(root,'big.czbak'),recovered=join(root,'verified.dump');
   writeFileSync(original,data,{mode:0o600});
   assert.equal(call(['seal',original,sealed],key).status,0);
   assert.equal(call(['verify',sealed],key).status,0);
   assert.equal(call(['extract',sealed,recovered],key).status,0);
   assert.equal(hash(readFileSync(recovered)),hash(data));
   const bytes=Buffer.from(readFileSync(sealed));
   bytes[bytes.length-1]^=0x01;
   const corrupt=join(root,'bad-tag.czbak');
   writeFileSync(corrupt,bytes,{mode:0o600});
   assert.notEqual(call(['verify',corrupt],key).status,0);
   const rejected=join(root,'rejected.dump');
   assert.notEqual(call(['extract',corrupt,rejected],key).status,0);
   assert.ok(!existsSync(rejected));
   const partials=readFileSync(original).length>0;
   assert.ok(partials);
 });
});
