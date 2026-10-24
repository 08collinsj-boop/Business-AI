import test from 'node:test';
import assert from 'node:assert/strict';
import { sqlTokens, compareMigrations } from '../scripts/lib/colzo-migration-audit.mjs';
test('SQL comparison ignores comments and whitespace but preserves literals, quoted names and statement boundaries',()=>{
 assert.deepEqual(sqlTokens("select 'a -- b'; /* nested /* x */ y */ SELECT 2;"),sqlTokens("select 'a -- b'; SELECT 2;"));
 assert.notDeepEqual(sqlTokens("select 'a b'"),sqlTokens("select 'a  b'"));
 assert.notDeepEqual(sqlTokens('select "A"'),sqlTokens('select "a"'));
 assert.notDeepEqual(sqlTokens('select 1;select 2'),sqlTokens('select 1 select 2'));
 assert.notDeepEqual(sqlTokens('select $$a  b$$'),sqlTokens('select $$a b$$'));
 assert.throws(()=>sqlTokens('select /* unfinished'),/unterminated/);
 assert.throws(()=>sqlTokens("select 'unfinished"),/unterminated/);
});
test('matching migration names cannot conceal SQL differences and SQL matches do not depend on names',()=>{
 const result=compareMigrations([{path:'1_one.sql',version:'1',name:'one',sql:'select 1;'}, {path:'2_two.sql',version:'2',name:'two',sql:'select 2;'}],[{version:'1',name:'one',statements:['select 99']},{version:'9',name:'renamed',statements:['select 2']}]);
 assert.equal(result.files[0].sqlMatches.length,0);
 assert.equal(result.files[0].sameVersion[0].sqlEqual,false);
 assert.equal(result.files[1].sqlMatches[0].version,'9');
 assert.equal(result.summary.repositoryFiles,2);
 assert.equal(result.summary.ledgerEntries,2);
});
