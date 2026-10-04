import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

const [finalShowcase, index, premiumUi] = await Promise.all([
  readFile(new URL('../assets/final-showcase.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../assets/premium-ui.js', import.meta.url), 'utf8')
]);

test('UK customer phone links normalise domestic numbers to unambiguous +44 dial targets', () => {
  assert.match(finalShowcase, /if\(\/\^0\\d\+\$\/\.test\(dial\)\)dial='\+44'\+dial\.slice\(1\)/);
  assert.match(finalShowcase, /location\.href='tel:'\+dial/);
  assert.match(finalShowcase, /location\.href='sms:'\+dial/);
  assert.match(index, /normalisePublicDialNumber/);
  assert.match(index, /window\.location\.href='tel:'\+dial/);
  assert.match(premiumUi, /final-showcase\.js\?v=20261004-phone-dial-1/);
});

test('documented UK mobile example maps to the intended international dial string', () => {
  const normalise = value => {
    let dial=String(value||'').trim().replace(/[^+\d]/g,'');
    if(!dial)return '';
    if(dial.startsWith('00'))dial='+'+dial.slice(2);
    if(/^44\d+$/.test(dial))dial='+'+dial;
    if(/^\+44(?:0)/.test(dial))dial='+44'+dial.slice(4);
    if(/^0\d+$/.test(dial))dial='+44'+dial.slice(1);
    return dial;
  };
  assert.equal(normalise('07849243242'), '+447849243242');
  assert.equal(normalise('+44 7849 243242'), '+447849243242');
  assert.equal(normalise('0044 7849 243242'), '+447849243242');
});


test('customer transcript phone wins over AI-extracted phone and malformed 00 values are not persisted', () => {
  assert.match(index, /detectedPhone \|\|\s*normalisePhone\(lead\.phone\)/);
  assert.match(index, /if \(digits\.startsWith\(\"00\"\)\) return null/);
  assert.match(index, /digits\.startsWith\(\"0044\"\)/);
});

test('legacy malformed lead phone can recover the valid UK number from enquiry details', () => {
  assert.match(finalShowcase, /const leadPhoneNumber=value=>normaliseUkDisplayNumber\(value\?\.phone\)\|\|findUkPhoneInText/);
  assert.match(finalShowcase, /const phone=leadPhoneNumber\(x\)/);
  assert.match(finalShowcase, /☎ \${E\(phone\)}/);
  assert.match(finalShowcase, /if\(\/\^00\/\.test\(dial\)\)return ''/);
});
